require("dotenv").config()

const { Resend } = require("resend")

const mailSender = async (email, title, body) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY is missing")
      return { success: false, error: "RESEND_API_KEY is missing" }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Support the existing development override while using a generic name
    // for all FrHelp emails going forward.
    const recipient =
      process.env.EMAIL_RECIPIENT_OVERRIDE ||
      process.env.RESET_EMAIL_OVERRIDE ||
      email

    const from = process.env.MAIL_FROM || "FrHelp <onboarding@resend.dev>"

    console.log("📩 Requested email recipient:", email)
    if (recipient !== email) {
      console.log("🧪 Development recipient override active:", recipient)
    } else {
      console.log("📩 Sending FrHelp email to:", recipient)
    }

    const response = await resend.emails.send({
      from,
      to: recipient,
      subject: title,
      html: body,
    })

    if (response.error) {
      console.error("❌ RESEND EMAIL ERROR:", response.error)
      return { success: false, error: response.error.message }
    }

    console.log("✅ RESEND EMAIL SUCCESS:", response)

    return {
      success: true,
      response,
      requestedRecipient: email,
      deliveredTo: recipient,
    }
  } catch (error) {
    console.error("❌ RESEND EMAIL ERROR:", error)
    return { success: false, error: error.message }
  }
}

module.exports = mailSender
