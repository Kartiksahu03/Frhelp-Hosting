require("dotenv").config();

const { Resend } = require("resend");

const mailSender = async (email, title, body) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY is missing");
      return { success: false, error: "RESEND_API_KEY is missing" };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Resend test mode only allows delivery to the account owner's email.
    // RESET_EMAIL_OVERRIDE is intended only for local/demo development.
    const recipient = process.env.RESET_EMAIL_OVERRIDE || email;

    console.log("📩 Requested email recipient:", email);
    if (recipient !== email) {
      console.log("🧪 Development override active. Sending reset email to:", recipient);
    } else {
      console.log("📩 Sending email via Resend to:", recipient);
    }

    const response = await resend.emails.send({
      from: "FrHelp <onboarding@resend.dev>",
      to: recipient,
      subject: title,
      html: body,
    });

    if (response.error) {
      console.error("❌ RESEND EMAIL ERROR:", response.error);
      return { success: false, error: response.error.message };
    }

    console.log("✅ RESEND EMAIL SUCCESS:", response);

    return {
      success: true,
      response,
      requestedRecipient: email,
      deliveredTo: recipient,
    };
  } catch (error) {
    console.error("❌ RESEND EMAIL ERROR:", error);
    return { success: false, error: error.message };
  }
};

module.exports = mailSender;
