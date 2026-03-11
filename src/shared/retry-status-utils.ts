const RETRY_COUNTDOWN_PATTERN = /\[\s*retrying\s+in[^\]]*\]/gi

function collapseWhitespace(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

export function extractRetryAttempt(attempt: number | undefined, message: string): number | "?" {
  if (typeof attempt === "number" && Number.isFinite(attempt)) {
    return attempt
  }

  const parsedAttempt = message.match(/attempt\s*#\s*(\d+)/i)?.[1]
  return parsedAttempt ? Number.parseInt(parsedAttempt, 10) : "?"
}

export function extractRetryStatusModel(message: string): string | undefined {
  return message.match(/model\s+([a-z0-9._/-]+)(?=\s+(?:are|is)\b)/i)?.[1]?.toLowerCase()
}

export function normalizeRetryStatusMessage(message: string): string {
  const normalizedMessage = collapseWhitespace(message.replace(RETRY_COUNTDOWN_PATTERN, " "))
  if (!normalizedMessage) {
    return "retry"
  }

  if (/all\s+credentials\s+for\s+model|cool(?:ing)?\s+down|cooldown|exhausted\s+your\s+capacity/.test(normalizedMessage)) {
    return "cooldown"
  }

  if (/too\s+many\s+requests/.test(normalizedMessage)) {
    return "too-many-requests"
  }

  if (/quota\s+will\s+reset\s+after|quota\s*exceeded/.test(normalizedMessage)) {
    return "quota"
  }

  if (/usage\s+limit\s+has\s+been\s+reached|limit\s+reached/.test(normalizedMessage)) {
    return "usage-limit"
  }

  if (/rate\s+limit/.test(normalizedMessage)) {
    return "rate-limit"
  }

  if (/service.?unavailable|temporarily.?unavailable|overloaded/.test(normalizedMessage)) {
    return "service-unavailable"
  }

  return normalizedMessage
}
