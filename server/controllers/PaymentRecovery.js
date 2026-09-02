const Groq = require("groq-sdk")
const PaymentExperiment = require("../models/PaymentExperiment")
const mailSender = require("../utils/mailSender")
const { instance } = require("../config/razorpay")
const {
  ALLOWED_ACTIONS,
  validateRecoveryAction,
  getBaselineAction,
} = require("../utils/recoveryRules")

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const getAIAction = async (errorData) => {
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "payment_recovery_action",
        strict: true,
        schema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ALLOWED_ACTIONS,
            },
          },
          required: ["action"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system",
        content: `You are a payment recovery decision assistant. Read only the payment failure fields provided. Choose exactly one action from this list: ${ALLOWED_ACTIONS.join(", ")}. Do not invent discounts, free courses, refunds, prices, users, or any action outside the list.`,
      },
      {
        role: "user",
        content: JSON.stringify(errorData),
      },
    ],
  })

  const parsed = JSON.parse(completion.choices[0].message.content || "{}")
  return validateRecoveryAction(parsed.action)
}

const createRecoveryEmail = (customerName, message) => {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000"
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2>FrHelp Payment Update</h2>
      <p>Hi ${customerName || "Learner"},</p>
      <p>${message}</p>
      <p>Your course access will only be provided after a successful verified payment.</p>
      <p>Thank you,<br/>FrHelp Team</p>
    </div>
  `
}

const executeRecoveryAction = async (paymentRecord) => {
  const action = paymentRecord.chosenAction

  if (action === "do_nothing") {
    paymentRecord.actionExecuted = false
    paymentRecord.executionStatus = "not_required"
    paymentRecord.executionNote = "No recovery action was required"
    await paymentRecord.save()
    return paymentRecord
  }

  if (action === "retry_now") {
    paymentRecord.actionExecuted = true
    paymentRecord.executionStatus = "waiting_for_retry"
    paymentRecord.executionNote = "Customer must start a fresh Razorpay Checkout retry"
    await paymentRecord.save()
    return paymentRecord
  }

  if (action === "send_reminder") {
    if (!paymentRecord.customerEmail) {
      paymentRecord.executionStatus = "failed"
      paymentRecord.executionNote = "Customer email was not available for reminder"
      await paymentRecord.save()
      return paymentRecord
    }

    const emailResult = await mailSender(
      paymentRecord.customerEmail,
      "Complete your FrHelp course payment",
      createRecoveryEmail(
        paymentRecord.customerName,
        "Your payment was not completed. You can return to FrHelp and try the payment again."
      )
    )

    paymentRecord.actionExecuted = emailResult.success
    paymentRecord.executionStatus = emailResult.success ? "executed" : "failed"
    paymentRecord.executionNote = emailResult.success
      ? "Payment reminder email sent"
      : "Payment reminder email could not be sent"
    await paymentRecord.save()
    return paymentRecord
  }

  if (action === "retry_later") {
    if (!paymentRecord.customerEmail) {
      paymentRecord.executionStatus = "failed"
      paymentRecord.executionNote = "Customer email was not available for retry-later message"
      await paymentRecord.save()
      return paymentRecord
    }

    const emailResult = await mailSender(
      paymentRecord.customerEmail,
      "Try your FrHelp payment again later",
      createRecoveryEmail(
        paymentRecord.customerName,
        "The payment could not be completed right now. Please wait and try again later from your FrHelp account."
      )
    )

    paymentRecord.actionExecuted = emailResult.success
    paymentRecord.executionStatus = emailResult.success ? "executed" : "failed"
    paymentRecord.executionNote = emailResult.success
      ? "Retry-later email sent"
      : "Retry-later email could not be sent"
    await paymentRecord.save()
    return paymentRecord
  }

  if (action === "send_upi_link") {
    // Razorpay does not support UPI Payment Links in Test Mode.
    // Keep this exception visible instead of pretending a UPI link was sent.
    if (process.env.RAZORPAY_KEY?.startsWith("rzp_test_")) {
      paymentRecord.actionExecuted = false
      paymentRecord.executionStatus = "exception"
      paymentRecord.executionNote = "UPI Payment Links are not supported in Razorpay Test Mode"
      await paymentRecord.save()
      return paymentRecord
    }

    try {
      const paymentLink = await instance.paymentLink.create({
        upi_link: true,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency || "INR",
        reference_id: `rec_${paymentRecord._id}`.slice(0, 40),
        description: "FrHelp course payment recovery",
        customer: {
          name: paymentRecord.customerName || "FrHelp Learner",
          email: paymentRecord.customerEmail,
        },
        reminder_enable: true,
        notes: {
          experimentId: paymentRecord.experimentId,
          strategy: paymentRecord.strategy,
          originalPaymentId: paymentRecord.paymentId || "",
        },
      })

      paymentRecord.actionExecuted = true
      paymentRecord.executionStatus = "executed"
      paymentRecord.executionNote = "UPI Payment Link created"
      paymentRecord.recoveryLink = paymentLink.short_url || ""
      await paymentRecord.save()
      return paymentRecord
    } catch (error) {
      console.error("UPI LINK CREATION ERROR:", error)
      paymentRecord.actionExecuted = false
      paymentRecord.executionStatus = "failed"
      paymentRecord.executionNote = "UPI Payment Link could not be created"
      await paymentRecord.save()
      return paymentRecord
    }
  }

  return paymentRecord
}

exports.recordFailedPayment = async (req, res) => {
  try {
    const {
      experimentId,
      strategy,
      scenarioId,
      amount,
      currency,
      customerName,
      customerEmail,
      orderId,
      paymentId,
      error,
    } = req.body

    if (
      !experimentId ||
      !strategy ||
      !scenarioId ||
      amount === undefined ||
      !error?.code ||
      !error?.reason
    ) {
      return res.status(400).json({
        success: false,
        message: "Required payment experiment data is missing",
      })
    }

    if (!["baseline", "ai"].includes(strategy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid experiment strategy",
      })
    }

    const existingRecord = await PaymentExperiment.findOne({
      experimentId,
      paymentId,
    })

    if (existingRecord) {
      return res.status(200).json({
        success: true,
        message: "Payment failure already recorded",
        data: existingRecord,
      })
    }

    let chosenAction = getBaselineAction()
    let actionSource = "baseline"

    if (strategy === "ai") {
      try {
        chosenAction = await getAIAction({
          error_code: error.code,
          error_reason: error.reason,
          error_description: error.description || "",
          error_source: error.source || "",
          error_step: error.step || "",
        })
        actionSource = "ai"
      } catch (error) {
        console.error("Payment Recovery AI Error:", error)
        chosenAction = "do_nothing"
        actionSource = "rule_fallback"
      }
    }

    let paymentRecord = await PaymentExperiment.create({
      experimentId,
      strategy,
      scenarioId,
      amount,
      currency: currency || "INR",
      customerName: customerName || "",
      customerEmail: customerEmail || "",
      orderId,
      paymentId,
      error_code: error.code,
      error_description: error.description || "",
      error_source: error.source || "",
      error_step: error.step || "",
      error_reason: error.reason,
      chosenAction: validateRecoveryAction(chosenAction),
      actionSource,
    })

    paymentRecord = await executeRecoveryAction(paymentRecord)

    return res.status(200).json({
      success: true,
      message: "Real payment failure recorded and recovery action processed",
      data: paymentRecord,
    })
  } catch (error) {
    console.error("PAYMENT RECOVERY ERROR:", error)
    return res.status(500).json({
      success: false,
      message: "Could not record payment failure",
    })
  }
}

exports.recordRecoveryResult = async (req, res) => {
  try {
    const {
      experimentId,
      paymentId,
      recoveryPaymentId,
      recoveryStatus,
      recoveredAmount,
    } = req.body

    if (!experimentId || !paymentId || !recoveryStatus) {
      return res.status(400).json({
        success: false,
        message: "Required recovery result data is missing",
      })
    }

    if (!["recovered", "unrecovered"].includes(recoveryStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recovery status",
      })
    }

    const updatedRecord = await PaymentExperiment.findOneAndUpdate(
      { experimentId, paymentId },
      {
        recoveryPaymentId: recoveryPaymentId || "",
        recoveryStatus,
        recoveredAmount: recoveryStatus === "recovered" ? recoveredAmount || 0 : 0,
      },
      { new: true }
    )

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: "Payment experiment record not found",
      })
    }

    return res.status(200).json({
      success: true,
      message: "Recovery result recorded",
      data: updatedRecord,
    })
  } catch (error) {
    console.error("RECOVERY RESULT ERROR:", error)
    return res.status(500).json({
      success: false,
      message: "Could not record recovery result",
    })
  }
}

exports.getRecoveryAnalytics = async (req, res) => {
  try {
    const { experimentId } = req.query

    const filter = experimentId ? { experimentId } : {}
    const records = await PaymentExperiment.find(filter).sort({ createdAt: -1 })

    const buildMetrics = (strategy) => {
      const data = records.filter((record) => record.strategy === strategy)
      const recovered = data.filter((record) => record.recoveryStatus === "recovered")

      const recoveredAmount = recovered.reduce(
        (total, record) => total + (record.recoveredAmount || 0),
        0
      )

      return {
        totalFailedPayments: data.length,
        recoveryAttempts: data.filter(
          (record) => record.chosenAction !== "do_nothing"
        ).length,
        successfulRecoveries: recovered.length,
        recoveryRate:
          data.length > 0
            ? Number(((recovered.length / data.length) * 100).toFixed(2))
            : 0,
        recoveredAmount,
      }
    }

    const baseline = buildMetrics("baseline")
    const ai = buildMetrics("ai")

    return res.status(200).json({
      success: true,
      data: {
        baseline,
        ai,
        incrementalRecoveredRevenue: ai.recoveredAmount - baseline.recoveredAmount,
        records,
      },
    })
  } catch (error) {
    console.error("RECOVERY ANALYTICS ERROR:", error)
    return res.status(500).json({
      success: false,
      message: "Could not fetch recovery analytics",
    })
  }
}
