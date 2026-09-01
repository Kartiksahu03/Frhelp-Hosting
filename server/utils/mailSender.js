const { Resend } = require("resend");

const mailSender = async (email, title, body) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing from server environment");
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
      throw new Error(response.error.message || "Resend email failed");
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