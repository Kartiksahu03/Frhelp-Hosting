const mongoose = require("mongoose")

const paymentExperimentSchema = new mongoose.Schema(
  {
    experimentId: {
      type: String,
      required: true,
    },
    strategy: {
      type: String,
      enum: ["baseline", "ai"],
      required: true,
    },
    scenarioId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    orderId: String,
    paymentId: String,
    error_code: String,
    error_description: String,
    error_source: String,
    error_step: String,
    error_reason: String,
    chosenAction: {
      type: String,
      enum: [
        "retry_now",
        "retry_later",
        "send_upi_link",
        "send_reminder",
        "do_nothing",
      ],
      required: true,
    },
    actionSource: {
      type: String,
      enum: ["baseline", "ai", "rule_fallback"],
      required: true,
    },
    recoveryStatus: {
      type: String,
      enum: ["pending", "recovered", "unrecovered"],
      default: "pending",
    },
    recoveryPaymentId: String,
    recoveredAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("PaymentExperiment", paymentExperimentSchema)
