const axios = require("axios");
const { sendEmail } = require("../../utils/sendEmail");

exports.handler = async (req, res) => {
  try {
    const { name, email, subject, message, captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({
        status: false,
        message: "Captcha token missing",
      });
    }

    // verify captcha
    const verifyRes = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captchaToken,
        },
      }
    );

    if (!verifyRes.data.success) {
      return res.status(400).json({
        status: false,
        message: "Captcha verification failed",
      });
    }

    const html = `
      <div style="font-family: Arial; padding: 16px;">
        <h2>📩 New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name || "N/A"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br/>")}</p>
      </div>
    `;

    await sendEmail({
      to: "shlomoyounger1@gmail.com",
      subject: `[Contact Form] ${subject}`,
      html,
      replyTo: email,
    });

    return res.status(200).json({
      status: true,
      message: "Message sent successfully",
    });

  } catch (err) {
    console.error("Email error:", err);

    return res.status(500).json({
      status: false,
      message: "Failed to send message",
    });
  }
};