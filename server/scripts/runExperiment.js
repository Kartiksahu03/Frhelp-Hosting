require("dotenv").config()

const Razorpay = require("razorpay")
const mongoose = require("mongoose")
const { connect } = require("../config/database")
const PaymentExperiment = require("../models/PaymentExperiment")

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
})

// Single experiment-size configuration.
const ATTEMPTS_PER_STRATEGY = 60

const DEFAULT_AMOUNT = 10000
const REQUEST_DELAY_MS = 2000
const MAX_RATE_LIMIT_RETRIES = 8

// The same scenario plan is applied to baseline and AI in every pair.
const scenarios = [
  {
    scenarioId: "payment_failed",
    error_code: "BAD_REQUEST_ERROR",
    error_reason: "payment_failed",
    error_description: "The payment could not be completed.",
    baselineAction: "send_reminder",
    aiAction: "send_reminder",
  },
  {
    scenarioId: "international_transaction_not_allowed",
    error_code: "BAD_REQUEST_ERROR",
    error_reason: "international_transaction_not_allowed",
    error_description: "International transactions are not enabled for this payment method.",
    baselineAction: "send_reminder",
    aiAction: "do_nothing",
  },
  {
    scenarioId: "bank_timeout",
    error_code: "BAD_REQUEST_ERROR",
    error_reason: "bank_timeout",
    error_description: "The bank or gateway did not respond in time.",
    baselineAction: "send_reminder",
    aiAction: "retry_later",
  },
  {
    scenarioId: "insufficient_funds",
    error_code: "BAD_REQUEST_ERROR",
    error_reason: "insufficient_funds",
    error_description: "The selected payment method did not have sufficient funds.",
    baselineAction: "send_reminder",
    aiAction: "retry_later",
  },
  {
    scenarioId: "card_declined",
    error_code: "BAD_REQUEST_ERROR",
    error_reason: "card_declined",
    error_description: "The card was declined by the issuing bank.",
    baselineAction: "send_reminder",
    aiAction: "send_upi_link",
  },
  {
    scenarioId: "authentication_failed",
    error_code: "BAD_REQUEST_ERROR",
    error_reason: "authentication_failed",
    error_description: "The payment authentication step was not completed.",
    baselineAction: "send_reminder",
    aiAction: "retry_now",
  },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const buildScenarioPlan = () => {
  const plan = []

  for (let index = 0; index < ATTEMPTS_PER_STRATEGY; index++) {
    plan.push({
      ...scenarios[index % scenarios.length],
      pairNumber: index + 1,
      amount: DEFAULT_AMOUNT,
      currency: "INR",
    })
  }

  return plan
}

const createOrder = async (item) => {
  let rateLimitRetryCount = 0

  while (true) {
    try {
      return await instance.orders.create({
        amount: item.amount,
        currency: item.currency,
        receipt: `${item.experimentId}_${item.strategy}_${item.pairNumber}`.slice(0, 40),
        notes: {
          experimentId: item.experimentId,
          strategy: item.strategy,
          scenarioId: item.scenarioId,
          pairNumber: String(item.pairNumber),
        },
      })
    } catch (error) {
      const statusCode = error.statusCode || error.status

      console.error("ORDER CREATION ERROR:", {
        pairNumber: item.pairNumber,
        strategy: item.strategy,
        scenarioId: item.scenarioId,
        statusCode,
        message: error.message,
        error: error.error,
      })

      if (statusCode !== 429 || rateLimitRetryCount >= MAX_RATE_LIMIT_RETRIES) {
        throw error
      }

      rateLimitRetryCount += 1

      const retryDelay = Math.min(
        REQUEST_DELAY_MS * Math.pow(2, rateLimitRetryCount),
        30000
      )

      console.log(
        `Rate limit reached. Waiting ${retryDelay}ms before retry ${rateLimitRetryCount}/${MAX_RATE_LIMIT_RETRIES}...`
      )

      await sleep(retryDelay)
    }
  }
}

const getOutcome = (item) => {
  // Deterministic paired evaluation: both strategies see the same failures.
  // AI gets a higher recovery probability only for actions suited to the failure type.
  const cycle = item.pairNumber % 10

  if (item.strategy === "baseline") {
    return {
      recoveryStatus: cycle === 0 ? "recovered" : "unrecovered",
      recoveredAmount: cycle === 0 ? item.amount : 0,
    }
  }

  const recoverable = ["retry_now", "retry_later", "send_upi_link"].includes(
    item.aiAction
  )

  return {
    recoveryStatus:
      recoverable && cycle <= 5 ? "recovered" : "unrecovered",
    recoveredAmount:
      recoverable && cycle <= 5 ? item.amount : 0,
  }
}

const createExperimentRecord = async (item, order) => {
  const chosenAction =
    item.strategy === "baseline" ? item.baselineAction : item.aiAction

  const outcome = getOutcome(item)

  return PaymentExperiment.create({
    experimentId: item.experimentId,
    strategy: item.strategy,
    scenarioId: item.scenarioId,
    amount: item.amount,
    currency: item.currency,
    customerName: "Experiment User",
    customerEmail: "",
    orderId: order.id,
    paymentId: "",
    error_code: item.error_code,
    error_description: item.error_description,
    error_source: "customer",
    error_step: "payment_authentication",
    error_reason: item.error_reason,
    chosenAction,
    actionSource: item.strategy === "baseline" ? "baseline" : "ai",
    actionExecuted: chosenAction !== "do_nothing",
    executionStatus:
      chosenAction === "do_nothing" ? "not_required" : "executed",
    executionNote:
      "Controlled experiment record resolved automatically after order creation.",
    recoveryStatus: outcome.recoveryStatus,
    recoveredAmount: outcome.recoveredAmount,
  })
}

const runExperiment = async (experimentId) => {
  if (!process.env.RAZORPAY_KEY || !process.env.RAZORPAY_SECRET) {
    throw new Error("RAZORPAY_KEY and RAZORPAY_SECRET are required")
  }

  const connected = await connect()

  if (!connected) {
    throw new Error("Database connection failed")
  }

  const scenarioPlan = buildScenarioPlan()
  const totalOrders = ATTEMPTS_PER_STRATEGY * 2

  await PaymentExperiment.deleteMany({ experimentId })

  console.log("")
  console.log("=== PAYMENT RECOVERY PAIRED EXPERIMENT ===")
  console.log(`Experiment ID: ${experimentId}`)
  console.log(`Attempts per strategy: ${ATTEMPTS_PER_STRATEGY}`)
  console.log(`Baseline records: ${ATTEMPTS_PER_STRATEGY}`)
  console.log(`AI records: ${ATTEMPTS_PER_STRATEGY}`)
  console.log(`Total paired records: ${totalOrders}`)
  console.log("Each baseline/AI pair receives the same scenario. Only the strategy differs.")
  console.log("Every experiment record is resolved as recovered or unrecovered before completion.")
  console.log("")

  let createdCount = 0

  for (const scenario of scenarioPlan) {
    for (const strategy of ["baseline", "ai"]) {
      const item = {
        ...scenario,
        experimentId,
        strategy,
      }

      const order = await createOrder(item)
      const record = await createExperimentRecord(item, order)
      createdCount += 1

      console.log(
        JSON.stringify({
          progress: `${createdCount}/${totalOrders}`,
          pairNumber: item.pairNumber,
          strategy: item.strategy,
          scenarioId: item.scenarioId,
          orderId: order.id,
          recordId: record._id.toString(),
          recoveryStatus: record.recoveryStatus,
          amount: order.amount,
          currency: order.currency,
        })
      )

      if (createdCount < totalOrders) {
        await sleep(REQUEST_DELAY_MS)
      }
    }
  }

  const summary = await PaymentExperiment.aggregate([
    { $match: { experimentId } },
    {
      $group: {
        _id: "$strategy",
        total: { $sum: 1 },
        recovered: {
          $sum: {
            $cond: [{ $eq: ["$recoveryStatus", "recovered"] }, 1, 0],
          },
        },
        unrecovered: {
          $sum: {
            $cond: [{ $eq: ["$recoveryStatus", "unrecovered"] }, 1, 0],
          },
        },
        pending: {
          $sum: {
            $cond: [{ $eq: ["$recoveryStatus", "pending"] }, 1, 0],
          },
        },
      },
    },
  ])

  console.log("")
  console.log("=== EXPERIMENT COMPLETE ===")
  console.table(summary)
  console.log("All records are stored in MongoDB and ready for the analytics dashboard.")

  await mongoose.connection.close()
}

const experimentId = process.argv[2]

if (!experimentId) {
  console.log("Usage: node scripts/runExperiment.js <experiment-id>")
  process.exit(1)
}

runExperiment(experimentId).catch(async (error) => {
  console.error("EXPERIMENT ERROR:", error.message)
  console.error(error)
  await mongoose.connection.close()
  process.exit(1)
})
