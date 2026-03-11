import type { OhMyOpenCodeConfig, HookName } from "../../config"

import { createModelFallbackHook } from "../../hooks"
import { normalizeSDKResponse } from "../../shared"

import { resolveModelFallbackEnabled } from "./model-fallback-config"

type SafeHook = <THook>(hookName: HookName, factory: () => THook) => THook | null

type ModelFallbackSessionContext = {
  directory: string
  client: {
    session: {
      get: (input: { path: { id: string } }) => Promise<unknown>
      update: (input: {
        path: { id: string }
        body: { title: string }
        query: { directory: string }
      }) => Promise<unknown>
    }
    tui: {
      showToast: (input: {
        body: {
          title: string
          message: string
          variant: "success" | "error" | "info" | "warning"
          duration: number
        }
      }) => Promise<unknown>
    }
  }
}

function createFallbackTitleUpdater(
  ctx: ModelFallbackSessionContext,
  enabled: boolean,
):
  | ((input: {
      sessionID: string
      providerID: string
      modelID: string
      variant?: string
    }) => Promise<void>)
  | undefined {
  if (!enabled) {
    return undefined
  }

  const fallbackTitleMaxEntries = 200
  const fallbackTitleState = new Map<string, { baseTitle?: string; lastKey?: string }>()

  return async (input) => {
    const key = `${input.providerID}/${input.modelID}${input.variant ? `:${input.variant}` : ""}`
    const existing = fallbackTitleState.get(input.sessionID) ?? {}
    if (existing.lastKey === key) {
      return
    }

    if (!existing.baseTitle) {
      const sessionResp = await ctx.client.session.get({ path: { id: input.sessionID } }).catch(() => null)
      const sessionInfo = sessionResp
        ? normalizeSDKResponse(sessionResp, null as { title?: string } | null, {
            preferResponseOnMissingData: true,
          })
        : null
      const rawTitle = sessionInfo?.title
      if (typeof rawTitle === "string" && rawTitle.length > 0) {
        existing.baseTitle = rawTitle.replace(/\s*\[fallback:[^\]]+\]$/i, "").trim()
      } else {
        existing.baseTitle = "Session"
      }
    }

    const variantLabel = input.variant ? ` ${input.variant}` : ""
    const newTitle = `${existing.baseTitle} [fallback: ${input.providerID}/${input.modelID}${variantLabel}]`

    await ctx.client.session
      .update({
        path: { id: input.sessionID },
        body: { title: newTitle },
        query: { directory: ctx.directory },
      })
      .catch(() => {})

    existing.lastKey = key
    fallbackTitleState.set(input.sessionID, existing)
    if (fallbackTitleState.size > fallbackTitleMaxEntries) {
      const oldestKey = fallbackTitleState.keys().next().value
      if (oldestKey) {
        fallbackTitleState.delete(oldestKey)
      }
    }
  }
}

export function createConfiguredModelFallbackHook(args: {
  ctx: ModelFallbackSessionContext
  pluginConfig: OhMyOpenCodeConfig
  isHookEnabled: (hookName: HookName) => boolean
  safeHook: SafeHook
}): ReturnType<typeof createModelFallbackHook> | null {
  const { ctx, pluginConfig, isHookEnabled, safeHook } = args
  const isModelFallbackEnabled = resolveModelFallbackEnabled(pluginConfig)

  if (!isModelFallbackEnabled || !isHookEnabled("model-fallback")) {
    return null
  }

  const onApplied = createFallbackTitleUpdater(
    ctx,
    pluginConfig.experimental?.model_fallback_title ?? false,
  )

  return safeHook("model-fallback", () =>
    createModelFallbackHook({
      toast: async ({ title, message, variant, duration }) => {
        await ctx.client.tui
          .showToast({
            body: {
              title,
              message,
              variant: variant ?? "warning",
              duration: duration ?? 5000,
            },
          })
          .catch(() => {})
      },
      onApplied,
    }),
  )
}
