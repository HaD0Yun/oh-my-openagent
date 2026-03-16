import { createServerConnection } from "../../../src/cli/run/server-connection"
import { executeRunSession } from "../../../src/cli/run/run-engine"
import type { RunEventObserver, ServerConnection } from "../../../src/cli/run/types"
import type {
  CreateOmoRunnerOptions,
  OmoRunInvocationOptions,
  OmoRunner,
  RunResult,
  StreamEvent,
} from "./types"

class AsyncEventQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = []
  private readonly waiters: Array<(value: IteratorResult<T>) => void> = []
  private closed = false

  push(value: T): void {
    if (this.closed) return
    const waiter = this.waiters.shift()
    if (waiter) {
      waiter({ value, done: false })
      return
    }
    this.values.push(value)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift()
      waiter?.({ value: undefined, done: true })
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        const value = this.values.shift()
        if (value !== undefined) {
          return Promise.resolve({ value, done: false })
        }
        if (this.closed) {
          return Promise.resolve({ value: undefined, done: true })
        }
        return new Promise<IteratorResult<T>>((resolve) => {
          this.waiters.push(resolve)
        })
      },
    }
  }
}

export function createOmoRunner(options: CreateOmoRunnerOptions): OmoRunner {
  const {
    directory,
    agent,
    port,
    model,
    attach,
    includeRawEvents = false,
    onIdle,
    onQuestion,
    onComplete,
    onError,
  } = options
  let connectionPromise: Promise<ServerConnection> | null = null
  let connectionController: AbortController | null = null
  let closed = false
  let activeRun: Promise<unknown> | null = null

  const silentLogger = {
    log: () => {},
    error: () => {},
  }

  const ensureConnection = async (): Promise<ServerConnection> => {
    if (closed) {
      throw new Error("Runner is closed")
    }
    if (connectionPromise === null) {
      connectionController = new AbortController()
      connectionPromise = createServerConnection({
        port,
        attach,
        signal: connectionController.signal,
        logger: silentLogger,
      })
    }
    return await connectionPromise
  }

  const createObserver = (
    queue?: AsyncEventQueue<StreamEvent>,
  ): RunEventObserver => ({
    includeRawEvents,
    onEvent: async (event) => {
      queue?.push(event as StreamEvent)
    },
    onIdle,
    onQuestion,
    onComplete,
    onError,
  })

  const runOnce = async (
    prompt: string,
    invocationOptions: OmoRunInvocationOptions | undefined,
    observer: RunEventObserver,
  ): Promise<RunResult> => {
    if (activeRun !== null) {
      throw new Error("Runner already has an active operation")
    }

    const connection = await ensureConnection()
    const execution = executeRunSession({
      client: connection.client,
      message: prompt,
      directory,
      agent: invocationOptions?.agent ?? agent,
      model: invocationOptions?.model ?? model,
      sessionId: invocationOptions?.sessionId,
      questionPermission: "allow",
      questionToolEnabled: true,
      renderOutput: false,
      logger: silentLogger,
      eventObserver: observer,
      signal: invocationOptions?.signal,
    })
    activeRun = execution

    const abortHandler = () => {
      void observer.onError?.({
        type: "session.error",
        sessionId: invocationOptions?.sessionId ?? "",
        error: "Aborted by caller",
      })
    }
    invocationOptions?.signal?.addEventListener("abort", abortHandler, { once: true })

    try {
      const { result } = await execution
      return result
    } finally {
      invocationOptions?.signal?.removeEventListener("abort", abortHandler)
      activeRun = null
    }
  }

  return {
    async run(prompt, invocationOptions) {
      return await runOnce(prompt, invocationOptions, createObserver())
    },
    stream(prompt, invocationOptions) {
      const queue = new AsyncEventQueue<StreamEvent>()
      const execution = runOnce(prompt, invocationOptions, createObserver(queue))
        .catch((error) => {
          queue.push({
            type: "session.error",
            sessionId: invocationOptions?.sessionId ?? "",
            error: error instanceof Error ? error.message : String(error),
          })
        })
        .finally(() => {
          queue.close()
        })

      return {
        async *[Symbol.asyncIterator]() {
          try {
            for await (const event of queue) {
              yield event
            }
          } finally {
            await execution
          }
        },
      }
    },
    async close() {
      closed = true
      connectionController?.abort()
      const connection = await connectionPromise
      connection?.cleanup()
      connectionPromise = null
      connectionController = null
    },
  }
}
