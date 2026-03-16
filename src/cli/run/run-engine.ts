import pc from "picocolors"
import type { OhMyOpenCodeConfig } from "../../config"
import { loadPluginConfig } from "../../plugin-config"
import { createEventState, processEvents, serializeError } from "./events"
import { loadAgentProfileColors } from "./agent-profile-colors"
import { pollForCompletion, type PollOptions } from "./poll-for-completion"
import { resolveRunAgent } from "./agent-resolver"
import { resolveRunModel } from "./model-resolver"
import { resolveSession } from "./session-resolver"
import type {
  OpencodeClient,
  RunContext,
  RunEventObserver,
  RunLogger,
  RunResult,
  SessionCompletedEvent,
} from "./types"

const EVENT_PROCESSOR_SHUTDOWN_TIMEOUT_MS = 2_000

export interface ExecuteRunSessionOptions {
  client: OpencodeClient
  message: string
  directory: string
  agent?: string
  model?: string
  sessionId?: string
  verbose?: boolean
  questionPermission?: "allow" | "deny"
  questionToolEnabled?: boolean
  pluginConfig?: OhMyOpenCodeConfig
  logger?: RunLogger
  renderOutput?: boolean
  eventObserver?: RunEventObserver
  pollOptions?: PollOptions
  signal?: AbortSignal
}

export interface ExecuteRunSessionResult {
  exitCode: number
  result: RunResult
  sessionId: string
}

export async function waitForEventProcessorShutdown(
  eventProcessor: Promise<void>,
  timeoutMs = EVENT_PROCESSOR_SHUTDOWN_TIMEOUT_MS,
): Promise<void> {
  const completed = await Promise.race([
    eventProcessor.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
  ])

  void completed
}

async function emitCompletionEvent(
  observer: RunEventObserver | undefined,
  result: RunResult,
): Promise<void> {
  if (!observer) return

  const event: SessionCompletedEvent = {
    type: "session.completed",
    sessionId: result.sessionId,
    result,
  }
  await observer.onEvent?.(event)
  await observer.onComplete?.(event)
}

export async function executeRunSession(
  options: ExecuteRunSessionOptions,
): Promise<ExecuteRunSessionResult> {
  const {
    client,
    message,
    directory,
    agent,
    model,
    sessionId,
    verbose = false,
    questionPermission = "deny",
    questionToolEnabled = false,
    pluginConfig = loadPluginConfig(directory, { command: "run" }),
    logger,
    renderOutput = true,
    eventObserver,
    pollOptions,
    signal,
  } = options
  const log = logger?.log ?? console.log

  const resolvedAgent = resolveRunAgent({ message, agent }, pluginConfig)
  const resolvedModel = resolveRunModel(model)
  const abortController = new AbortController()
  const startTime = Date.now()
  let resolvedSessionId: string | undefined
  
  // Check if signal was already aborted before setting up listener
  if (signal?.aborted) {
    abortController.abort()
  }
  
  const forwardAbort = () => abortController.abort()
  signal?.addEventListener("abort", forwardAbort, { once: true })

  try {
    resolvedSessionId = await resolveSession({
      client,
      sessionId,
      directory,
      questionPermission,
      logger,
    })

    if (renderOutput) {
      log(pc.dim(`Session: ${resolvedSessionId}`))
      if (resolvedModel) {
        log(pc.dim(`Model: ${resolvedModel.providerID}/${resolvedModel.modelID}`))
      }
    }

    await eventObserver?.onEvent?.({
      type: "session.started",
      sessionId: resolvedSessionId,
      agent: resolvedAgent,
      resumed: Boolean(sessionId),
      ...(resolvedModel ? { model: resolvedModel } : {}),
    })

    const ctx: RunContext = {
      client,
      sessionID: resolvedSessionId,
      directory,
      abortController,
      verbose,
      renderOutput,
      logger,
    }
    const events = await client.event.subscribe({ query: { directory } })
    const eventState = createEventState()
    if (renderOutput) {
      eventState.agentColorsByName = await loadAgentProfileColors(client)
    }
    const eventProcessor = processEvents(
      ctx,
      events.stream,
      eventState,
      eventObserver,
    ).catch(() => {})

    await client.session.promptAsync({
      path: { id: resolvedSessionId },
      body: {
        agent: resolvedAgent,
        ...(resolvedModel ? { model: resolvedModel } : {}),
        tools: {
          question: questionToolEnabled,
        },
        parts: [{ type: "text", text: message }],
      },
      query: { directory },
    })

    const exitCode = await pollForCompletion(ctx, eventState, abortController, pollOptions)
    abortController.abort()
    await waitForEventProcessorShutdown(eventProcessor)

    const result: RunResult = {
      sessionId: resolvedSessionId,
      success: exitCode === 0,
      durationMs: Date.now() - startTime,
      messageCount: eventState.messageCount,
      summary: eventState.lastPartText.slice(0, 200) || "Run completed",
    }

    if (exitCode === 0) {
      await emitCompletionEvent(eventObserver, result)
    }

    return {
      exitCode,
      result,
      sessionId: resolvedSessionId,
    }
  } catch (error) {
    abortController.abort()
    const serialized = serializeError(error)
    await eventObserver?.onEvent?.({
      type: "session.error",
      sessionId: resolvedSessionId ?? sessionId ?? "",
      error: serialized,
    })
    await eventObserver?.onError?.({
      type: "session.error",
      sessionId: resolvedSessionId ?? sessionId ?? "",
      error: serialized,
    })
    throw error
  } finally {
    signal?.removeEventListener("abort", forwardAbort)
  }
}
