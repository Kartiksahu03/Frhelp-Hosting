require("dotenv").config()

const Razorpay = require("razorpay")

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
})

const TOTAL_ATTEMPTS = 200
const DEFAULT_AMOUNT = 10000

const scenarioIds = [
  "card_declined",
  "authentication_failed",
  "insufficient_funds",
  "payment_cancelled",
  "bank_timeout",
]

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

const createOrders = async (strategy, experimentId) => {
  if (!process.env.RAZORPAY_KEY || !process.env.RAZORPAY_SECRET) {
    throw new Error("RAZORPAY_KEY and RAZORPAY_SECRET are required")
  }

  const plan = buildPlan(strategy, experimentId)

  console.log(`Creating ${plan.length} real Razorpay Test Mode orders for ${strategy}...`)
  console.log("Orders are created only. Payment success/failure must come from Razorpay Checkout using supported test credentials.")

  for (const item of plan) {
    const order = await instance.orders.create({
      amount: item.amount,
      currency: item.currency,
      receipt: `${experimentId}_${item.runNumber}`.slice(0, 40),
      notes: {
        experimentId: item.experimentId,
        strategy: item.strategy,
        scenarioId: item.scenarioId,
        runNumber: String(item.runNumber),
      },
    })

    console.log(JSON.stringify({
      runNumber: item.runNumber,
      strategy: item.strategy,
      scenarioId: item.scenarioId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    }))
  }
}

const strategy = process.argv[2]
const experimentId = process.argv[3]

if (!["baseline", "ai"].includes(strategy) || !experimentId) {
  console.log("Usage: node scripts/runExperiment.js baseline|ai experiment-id")
  process.exit(1)
}

createOrders(strategy, experimentId).catch((error) => {
  console.error("EXPERIMENT ORDER CREATION ERROR:", error.message)
  process.exit(1)
})
