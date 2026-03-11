import type { OhMyOpenCodeConfig } from "../../config"

import { log, normalizeFallbackModels } from "../../shared"

type FallbackModelsConfig = {
  fallback_models?: string | string[]
}

function hasFallbackModels(config: FallbackModelsConfig | undefined): boolean {
  return (normalizeFallbackModels(config?.fallback_models)?.length ?? 0) > 0
}

export function hasConfiguredModelFallbacks(pluginConfig: OhMyOpenCodeConfig): boolean {
  const agentConfigs = Object.values<FallbackModelsConfig | undefined>(pluginConfig.agents ?? {})
  if (agentConfigs.some(hasFallbackModels)) {
    return true
  }

  const categoryConfigs = Object.values<FallbackModelsConfig | undefined>(pluginConfig.categories ?? {})
  return categoryConfigs.some(hasFallbackModels)
}

export function resolveModelFallbackEnabled(pluginConfig: OhMyOpenCodeConfig): boolean {
  const hasConfiguredFallbacks = hasConfiguredModelFallbacks(pluginConfig)

  if (pluginConfig.model_fallback === false && hasConfiguredFallbacks) {
    log(
      "model_fallback is disabled while fallback_models are configured; set model_fallback=true to keep provider fallback retries enabled",
    )
  }

  return pluginConfig.model_fallback ?? hasConfiguredFallbacks
}
