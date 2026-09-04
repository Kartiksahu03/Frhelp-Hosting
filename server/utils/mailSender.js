const { Resend } = require("resend");

const mailSender = async (email, title, body) => {
  try {
    // Do not let a missing Resend key crash the entire backend at startup.
    if (!process.env.RESEND_API_KEY) {
      console.warn(
        "⚠️ RESEND_API_KEY is not configured. Email sending is unavailable."
      );

      return {
        success: false,
        message: "Email service is not configured",
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log("📩 Sending email via Resend to:", email);

    const response = await resend.emails.send({
      from: "FrHelp <onboarding@resend.dev>",
      to: email,
      subject: title,
      html: body,
    });

    console.log("✅ RESEND EMAIL SUCCESS:", response);

    return {
      success: true,
      response,
    };
  } catch (error) {
    console.error("❌ RESEND EMAIL ERROR:", error);

    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = mailSender;
