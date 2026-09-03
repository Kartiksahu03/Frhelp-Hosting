require("dotenv").config()

const Razorpay = require("razorpay")

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
})

// Single experiment-size configuration.
// Change only this value when you need a larger or smaller paired experiment.
const ATTEMPTS_PER_STRATEGY = 60

const DEFAULT_AMOUNT = 10000
const REQUEST_DELAY_MS = 2000
const MAX_RATE_LIMIT_RETRIES = 8

const scenarioIds = [
  "card_declined",
  "authentication_failed",
  "insufficient_funds",
  "payment_cancelled",
  "bank_timeout",
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const buildScenarioPlan = () => {
  const plan = []

  for (let index = 0; index < ATTEMPTS_PER_STRATEGY; index++) {
    plan.push({
      scenarioId: scenarioIds[index % scenarioIds.length],
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

const createPairedExperimentOrders = async (experimentId) => {
  if (!process.env.RAZORPAY_KEY || !process.env.RAZORPAY_SECRET) {
    throw new Error("RAZORPAY_KEY and RAZORPAY_SECRET are required")
  }

  const scenarioPlan = buildScenarioPlan()
  const totalOrders = ATTEMPTS_PER_STRATEGY * 2

  console.log("")
  console.log("=== PAYMENT RECOVERY PAIRED EXPERIMENT ===")
  console.log(`Experiment ID: ${experimentId}`)
  console.log(`Attempts per strategy: ${ATTEMPTS_PER_STRATEGY}`)
  console.log(`Baseline orders: ${ATTEMPTS_PER_STRATEGY}`)
  console.log(`AI orders: ${ATTEMPTS_PER_STRATEGY}`)
  console.log(`Total orders to create: ${totalOrders}`)
  console.log(
    "Each baseline/AI pair receives the same scenarioId. Only the recovery strategy differs."
  )
  console.log(
    "Orders are created only. Payment success/failure must still be produced through Razorpay Checkout using supported Test Mode credentials."
  )
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
      createdCount += 1

      console.log(
        JSON.stringify({
          progress: `${createdCount}/${totalOrders}`,
          pairNumber: item.pairNumber,
          strategy: item.strategy,
          scenarioId: item.scenarioId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        })
      )

      if (createdCount < totalOrders) {
        await sleep(REQUEST_DELAY_MS)
      }
    }
  }

  console.log("")
  console.log("=== EXPERIMENT ORDER CREATION COMPLETE ===")
  console.log(`Baseline orders created: ${ATTEMPTS_PER_STRATEGY}`)
  console.log(`AI orders created: ${ATTEMPTS_PER_STRATEGY}`)
  console.log(`Total paired orders created: ${totalOrders}`)
}

const experimentId = process.argv[2]

if (!experimentId) {
  console.log("Usage: node scripts/runExperiment.js <experiment-id>")
  process.exit(1)
}

createPairedExperimentOrders(experimentId).catch((error) => {
  console.error("EXPERIMENT ORDER CREATION ERROR:", error.message)
  console.error(error)
  process.exit(1)
})
