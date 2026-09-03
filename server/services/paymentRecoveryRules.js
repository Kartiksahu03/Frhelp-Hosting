"use strict"

const ALLOWED_ACTIONS = Object.freeze([
  "retry_now",
  "retry_later",
  "send_upi_link",
  "send_reminder",
  "do_nothing",
])

const FIXED_DECISION_KEYS = Object.freeze([
  "action",
  "delayHours",
  "discountPercent",
  "rationale",
])

const MAX_REMINDERS = 2
const MAX_RECOVERY_WINDOW_HOURS = 72
const MAX_DISCOUNT_PERCENT = 10
const QUIET_HOURS_START = 22
const QUIET_HOURS_END = 8

class PolicyViolationError extends Error {
  constructor(rule, message) {
    super(message)
    this.name = "PolicyViolationError"
    this.rule = rule
  }
}

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key)

const parseAIProposal = (rawProposal) => {
  let proposal = rawProposal

  if (typeof rawProposal === "string") {
    try {
      proposal = JSON.parse(rawProposal)
    } catch (error) {
      throw new PolicyViolationError("invalid_json", "AI output is not valid JSON.")
    }
  }

  if (proposal === null || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw new PolicyViolationError("invalid_schema", "AI output must be a JSON object.")
  }

  const keys = Object.keys(proposal)

  if (
    keys.length !== FIXED_DECISION_KEYS.length ||
    !FIXED_DECISION_KEYS.every((key) => hasOwn(proposal, key)) ||
    keys.some((key) => !FIXED_DECISION_KEYS.includes(key))
  ) {
    throw new PolicyViolationError(
      "invalid_schema",
      "AI output must contain only the fixed decision schema."
    )
  }

  if (typeof proposal.action !== "string" || !ALLOWED_ACTIONS.includes(proposal.action)) {
    throw new PolicyViolationError(
      "invalid_action",
      "AI proposed an action outside the allowed enum."
    )
  }

  if (
    typeof proposal.delayHours !== "number" ||
    !Number.isFinite(proposal.delayHours) ||
    proposal.delayHours < 0 ||
    proposal.delayHours > MAX_RECOVERY_WINDOW_HOURS
  ) {
    throw new PolicyViolationError(
      "invalid_delay",
      "delayHours must be a finite number between 0 and 72."
    )
  }

  if (
    typeof proposal.discountPercent !== "number" ||
    !Number.isFinite(proposal.discountPercent) ||
    proposal.discountPercent < 0 ||
    proposal.discountPercent > MAX_DISCOUNT_PERCENT
  ) {
    throw new PolicyViolationError(
      "discount_limit",
      "discountPercent must be a finite number between 0 and 10."
    )
  }

  if (
    typeof proposal.rationale !== "string" ||
    proposal.rationale.trim().length === 0 ||
    proposal.rationale.length > 500
  ) {
    throw new PolicyViolationError(
      "invalid_schema",
      "rationale must be a non-empty string of at most 500 characters."
    )
  }

  return {
    action: proposal.action,
    delayHours: proposal.delayHours,
    discountPercent: proposal.discountPercent,
    rationale: proposal.rationale.trim(),
  }
}

const getHoursSinceFailure = (failedAt, now) => {
  const failedAtDate = new Date(failedAt)
  const nowDate = new Date(now)

  if (Number.isNaN(failedAtDate.getTime()) || Number.isNaN(nowDate.getTime())) {
    throw new PolicyViolationError(
      "invalid_context",
      "failedAt and now must be valid dates."
    )
  }

  return (nowDate.getTime() - failedAtDate.getTime()) / (60 * 60 * 1000)
}

const isQuietHours = (now) => {
  const date = new Date(now)

  if (Number.isNaN(date.getTime())) {
    throw new PolicyViolationError("invalid_context", "now must be a valid date.")
  }

  const hour = date.getHours()
  return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END
}

const validateAIDecision = (rawProposal, context) => {
  const proposal = parseAIProposal(rawProposal)

  if (!context || typeof context !== "object") {
    throw new PolicyViolationError("invalid_context", "Recovery context is required.")
  }

  if (context.alreadyPurchased === true && proposal.action !== "do_nothing") {
    throw new PolicyViolationError(
      "already_purchased",
      "No recovery action is allowed after the course is already purchased."
    )
  }

  if (context.optedOut === true && proposal.action !== "do_nothing") {
    throw new PolicyViolationError(
      "opted_out",
      "No recovery action is allowed for a user who opted out."
    )
  }

  const remindersSent = Number(context.remindersSent || 0)

  if (!Number.isInteger(remindersSent) || remindersSent < 0) {
    throw new PolicyViolationError(
      "invalid_context",
      "remindersSent must be a non-negative integer."
    )
  }

  if (proposal.action === "send_reminder" && remindersSent >= MAX_REMINDERS) {
    throw new PolicyViolationError(
      "reminder_limit",
      "A failed payment cannot receive more than two reminders."
    )
  }

  const hoursSinceFailure = getHoursSinceFailure(context.failedAt, context.now)

  if (
    hoursSinceFailure > MAX_RECOVERY_WINDOW_HOURS &&
    proposal.action !== "do_nothing"
  ) {
    throw new PolicyViolationError(
      "recovery_window_expired",
      "Recovery actions stop after three days."
    )
  }

  if (isQuietHours(context.now) && proposal.action !== "do_nothing") {
    throw new PolicyViolationError(
      "quiet_hours",
      "No recovery action is allowed between 10 PM and 8 AM."
    )
  }

  return Object.freeze({
    ...proposal,
    approvedBy: "deterministic_policy_guard",
  })
}

// The AI can only propose. This module never calls payment, email, discount,
// or course-access functions. Application code may execute only an approved result.
const proposeThenValidate = (rawAIProposal, context) =>
  validateAIDecision(rawAIProposal, context)

module.exports = {
  ALLOWED_ACTIONS,
  FIXED_DECISION_KEYS,
  MAX_REMINDERS,
  MAX_RECOVERY_WINDOW_HOURS,
  MAX_DISCOUNT_PERCENT,
  QUIET_HOURS_START,
  QUIET_HOURS_END,
  PolicyViolationError,
  parseAIProposal,
  validateAIDecision,
  proposeThenValidate,
}
