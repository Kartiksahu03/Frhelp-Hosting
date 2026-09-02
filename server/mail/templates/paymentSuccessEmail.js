exports.paymentSuccessEmail = (name, amount, orderId, paymentId) => {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000"

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>FrHelp Payment Confirmation</title>
    </head>
    <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#1f2937;">
      <div style="max-width:600px;margin:32px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
        <div style="padding:24px 32px;background:#111827;color:#ffffff;">
          <h1 style="margin:0;font-size:26px;">FrHelp</h1>
          <p style="margin:8px 0 0;color:#cbd5e1;">Payment confirmation</p>
        </div>
        <div style="padding:32px;">
          <p style="margin-top:0;">Hi ${name || "Learner"},</p>
          <p>We have successfully received your payment of <strong>₹${Number(amount || 0).toFixed(2)}</strong>.</p>
          <div style="margin:20px 0;padding:16px;background:#f8fafc;border-radius:8px;">
            <p style="margin:0 0 8px;"><strong>Payment ID:</strong> ${paymentId}</p>
            <p style="margin:0;"><strong>Order ID:</strong> ${orderId}</p>
          </div>
          <p>Your enrollment will be available after payment verification is completed.</p>
          <a href="${appUrl}/dashboard/enrolled-courses" style="display:inline-block;margin-top:12px;padding:12px 20px;background:#facc15;color:#111827;text-decoration:none;border-radius:8px;font-weight:700;">
            View My Courses
          </a>
          <p style="margin:28px 0 0;color:#64748b;font-size:14px;">Thank you,<br>FrHelp Team</p>
        </div>
      </div>
    </body>
  </html>`
}
