const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// ================= RESET PASSWORD TOKEN =================
exports.resetPasswordToken = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email is not registered",
      });
    }

    const token = crypto.randomBytes(20).toString("hex");

    user.token = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      user.token = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: "FRONTEND_URL is missing from server environment",
      });
    }

    const resetLink = `${frontendUrl.replace(/\/$/, "")}/update-password/${token}`;

    const mailResponse = await mailSender(
      email,
      "Reset Your FrHelp Password",
      `
        <h2>Reset your FrHelp password</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
            Reset Password
          </a>
        </p>
        <p>This link is valid for 15 minutes.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      `
    );

    if (!mailResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Unable to send reset email",
      });
    }

    return res.json({
      success: true,
      message: "Reset password email sent successfully",
    });
  } catch (error) {
    console.error("❌ RESET PASSWORD TOKEN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Error while sending reset password email",
    });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword, token } = req.body;

    if (!password || !confirmPassword || !token) {
      return res.status(400).json({
        success: false,
        message: "Password, confirm password and token are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const user = await User.findOne({ token: token.trim() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset link",
      });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Reset link expired. Please request a new one.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.token = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("❌ RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Error resetting password",
    });
  }
};