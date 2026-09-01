require("dotenv").config()

const scenarioIds = [
  "card_declined",
  "authentication_failed",
  "insufficient_funds",
  "payment_cancelled",
  "bank_timeout"
]

const TOTAL_PER_STRATEGY = 200

const buildPlan = (strategy, experimentId) => {
  const plan = []

  for (let index = 0; index < TOTAL_PER_STRATEGY; index++) {
    plan.push({
      experimentId,
      strategy,
      scenarioId: scenarioIds[index % scenarioIds.length],
      runNumber: index + 1,
    })
  }

  return plan
}

const strategy = process.argv[2]
const experimentId = process.argv[3]

if (!["baseline", "ai"].includes(strategy) || !experimentId) {
  console.log("Usage: node scripts/runExperiment.js baseline|ai experiment-id")
  process.exit(1)
}

const plan = buildPlan(strategy, experimentId)

console.log(JSON.stringify(plan, null, 2))
console.log("\nGenerated " + plan.length + " real-payment test scenarios.")
console.log("This script does not fabricate Razorpay failures or outcomes.")
console.log("Each scenario must be completed using a supported Razorpay Test Mode checkout attempt.")
