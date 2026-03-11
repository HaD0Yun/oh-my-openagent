declare const require: (name: string) => any
const { describe, expect, test } = require("bun:test")

import type { OhMyOpenCodeConfig } from "../../config"

import {
  hasConfiguredModelFallbacks,
  resolveModelFallbackEnabled,
} from "./model-fallback-config"

describe("model-fallback-config", () => {
  test("detects agent fallback_models configuration", () => {
    //#given
    const pluginConfig: OhMyOpenCodeConfig = {
      agents: {
        sisyphus: {
          fallback_models: ["openai/gpt-5.2", "anthropic/claude-opus-4-6"],
        },
      },
    }

    //#when
    const result = hasConfiguredModelFallbacks(pluginConfig)

    //#then
    expect(result).toBe(true)
  })

  test("auto-enables model fallback when category fallback_models are configured", () => {
    //#given
    const pluginConfig: OhMyOpenCodeConfig = {
      categories: {
        quick: {
          fallback_models: ["openai/gpt-5.2"],
        },
      },
    }

    //#when
    const result = resolveModelFallbackEnabled(pluginConfig)

    //#then
    expect(result).toBe(true)
  })

  test("keeps model fallback disabled when explicitly turned off", () => {
    //#given
    const pluginConfig: OhMyOpenCodeConfig = {
      model_fallback: false,
      agents: {
        sisyphus: {
          fallback_models: ["openai/gpt-5.2"],
        },
      },
    }

    //#when
    const result = resolveModelFallbackEnabled(pluginConfig)

    //#then
    expect(result).toBe(false)
  })
})
