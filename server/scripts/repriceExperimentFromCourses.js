require("dotenv").config()

const mongoose = require("mongoose")
const { connect } = require("../config/database")
const PaymentExperiment = require("../models/PaymentExperiment")
const Course = require("../models/Course")

const getExperimentCourses = async () => {
  const courses = await Course.find({
    price: { $gt: 0 },
  })
    .select("_id courseName price")
    .sort({ createdAt: 1 })

  const validCourses = courses.filter(
    (course) =>
      typeof course.price === "number" &&
      Number.isFinite(course.price) &&
      course.price > 0
  )

  if (validCourses.length === 0) {
    throw new Error(
      "No courses with a valid numeric price were found. Create a priced course before running this repair."
    )
  }

  return validCourses
}

const updateStrategyRecords = async (experimentId, strategy, courses) => {
  const records = await PaymentExperiment.find({
    experimentId,
    strategy,
  }).sort({ createdAt: 1, _id: 1 })

  if (records.length !== 60) {
    throw new Error(
      `Expected exactly 60 ${strategy} records for experiment "${experimentId}", but found ${records.length}.`
    )
  }

  let recoveredRevenue = 0

  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    const course = courses[index % courses.length]
    const amount = Number(course.price)
    const recoveredAmount =
      record.recoveryStatus === "recovered" ? amount : 0

    record.amount = amount
    record.recoveredAmount = recoveredAmount
    record.executionNote = [
      record.executionNote || "",
      `Experiment amount aligned to Course.price: ${course.courseName} (₹${amount}).`,
    ]
      .filter(Boolean)
      .join(" ")

    await record.save()

    recoveredRevenue += recoveredAmount

    console.log(
      JSON.stringify({
        progress: `${index + 1}/60`,
        strategy,
        recordId: record._id.toString(),
        scenarioId: record.scenarioId,
        courseName: course.courseName,
        coursePriceRupees: amount,
        recoveryStatus: record.recoveryStatus,
        recoveredAmount,
      })
    )
  }

  return {
    total: records.length,
    recoveredRevenue,
  }
}

const repairExperimentRevenue = async (experimentId) => {
  const connected = await connect()

  if (!connected) {
    throw new Error("Database connection failed")
  }

  const courses = await getExperimentCourses()

  console.log("")
  console.log("=== PAYMENT RECOVERY EXPERIMENT REVENUE REPAIR ===")
  console.log(`Experiment ID: ${experimentId}`)
  console.log("No Razorpay orders will be created by this script.")
  console.log("Existing experiment records will be updated in MongoDB only.")
  console.log("")
  console.log("Courses used for actual pricing:")
  courses.forEach((course) => {
    console.log({
      courseName: course.courseName,
      priceRupees: Number(course.price),
    })
  })
  console.log("")

  const baseline = await updateStrategyRecords(
    experimentId,
    "baseline",
    courses
  )

  const ai = await updateStrategyRecords(experimentId, "ai", courses)

  console.log("")
  console.log("=== REVENUE REPAIR COMPLETE ===")
  console.table([
    {
      strategy: "baseline",
      total: baseline.total,
      recoveredRevenue: baseline.recoveredRevenue,
    },
    {
      strategy: "ai",
      total: ai.total,
      recoveredRevenue: ai.recoveredRevenue,
    },
  ])
  console.log(
    "Existing Razorpay orders were reused. No new Razorpay order was created."
  )

  await mongoose.connection.close()
}

const experimentId = process.argv[2]

if (!experimentId) {
  console.log(
    "Usage: node scripts/repriceExperimentFromCourses.js <experiment-id>"
  )
  process.exit(1)
}

repairExperimentRevenue(experimentId).catch(async (error) => {
  console.error("REVENUE REPAIR ERROR:", error.message)
  console.error(error)
  await mongoose.connection.close()
  process.exit(1)
})
