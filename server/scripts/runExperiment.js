require("dotenv").config()

const Razorpay = require("razorpay")

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
})

const TOTAL_ATTEMPTS = 200
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

const buildPlan = (strategy, experimentId) => {
  const plan = []

  for (let index = 0; index < TOTAL_ATTEMPTS; index++) {
    plan.push({
      experimentId,
      strategy,
      scenarioId: scenarioIds[index % scenarioIds.length],
      runNumber: index + 1,
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
        receipt: `${item.experimentId}_${item.runNumber}`.slice(0, 40),
        notes: {
          experimentId: item.experimentId,
          strategy: item.strategy,
          scenarioId: item.scenarioId,
          runNumber: String(item.runNumber),
        },
      })
    } catch (error) {
      const statusCode = error.statusCode || error.status

      console.error("ORDER CREATION ERROR:", {
        runNumber: item.runNumber,
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

const createOrders = async (strategy, experimentId) => {
  if (!process.env.RAZORPAY_KEY || !process.env.RAZORPAY_SECRET) {
    throw new Error("RAZORPAY_KEY and RAZORPAY_SECRET are required")
  }

  const plan = buildPlan(strategy, experimentId)

  console.log(`Creating ${plan.length} real Razorpay Test Mode orders for ${strategy}...`)
  console.log(
    "Orders are created only. Payment success/failure must come from Razorpay Checkout using supported test credentials."
  )

  let createdCount = 0

  for (const item of plan) {
    const order = await createOrder(item)
    createdCount += 1

    console.log(
      JSON.stringify({
        runNumber: item.runNumber,
        strategy: item.strategy,
        scenarioId: item.scenarioId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      })
    )

    console.log(`Progress: ${createdCount}/${plan.length}`)

    if (createdCount < plan.length) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  console.log(`Completed: ${createdCount}/${plan.length} orders created.`)
}

const strategy = process.argv[2]
const experimentId = process.argv[3]

if (!["baseline", "ai"].includes(strategy) || !experimentId) {
  console.log("Usage: node scripts/runExperiment.js baseline|ai experiment-id")
  process.exit(1)
}

createOrders(strategy, experimentId).catch((error) => {
  console.error("EXPERIMENT ORDER CREATION ERROR:", error.message)
  console.error(error)
  process.exit(1)
})
