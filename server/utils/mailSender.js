require("dotenv").config();

const { Resend } = require("resend");

const mailSender = async (email, title, body) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY is missing");
      return {
        success: false,
        error: "RESEND_API_KEY is missing",
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

    if (response.error) {
      console.error("❌ RESEND EMAIL ERROR:", response.error);
      return {
        success: false,
        error: response.error.message,
      };
    }

    console.log("✅ RESEND EMAIL SUCCESS:", response);

    return {
      success: true,
      response,
    };
  } catch (error) {
    console.error("❌ RESEND EMAIL ERROR:", error);

    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = mailSender;