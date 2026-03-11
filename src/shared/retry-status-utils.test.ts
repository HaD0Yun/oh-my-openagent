declare const require: (name: string) => any
const { describe, expect, test } = require("bun:test")

import { extractRetryAttempt, extractRetryStatusModel, normalizeRetryStatusMessage } from "./retry-status-utils"

describe("retry-status-utils", () => {
  test("extracts retry attempt from explicit status attempt", () => {
    //#given
    const attempt = 6

    //#when
    const result = extractRetryAttempt(attempt, "The usage limit has been reached [retrying in 27s attempt #6]")

    //#then
    expect(result).toBe(6)
  })

  test("extracts retry model from cooldown status text", () => {
    //#given
    const message = "All credentials for model claude-opus-4-6 are cooling down [retrying in 7m 56s attempt #1]"

    //#when
    const result = extractRetryStatusModel(message)

    //#then
    expect(result).toBe("claude-opus-4-6")
  })

  test("normalizes countdown jitter to a stable cooldown class", () => {
    //#given
    const firstMessage = "All credentials for model claude-opus-4-6 are cooling down [retrying in 7m 56s attempt #1]"
    const secondMessage = "All credentials for model claude-opus-4-6 are cooling down [retrying in 7m 55s attempt #1]"

    //#when
    const firstResult = normalizeRetryStatusMessage(firstMessage)
    const secondResult = normalizeRetryStatusMessage(secondMessage)

    //#then
    expect(firstResult).toBe("cooldown")
    expect(secondResult).toBe("cooldown")
  })
})
