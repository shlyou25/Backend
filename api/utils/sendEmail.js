const axios = require("axios");

exports.sendEmail = async ({ to, subject, html }) => {
  try {
    const recipients = Array.isArray(to)
      ? to.map(email => ({ email }))
      : [{ email: to }];
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Domz",
          email: process.env.EMAIL_FROM
        },
        to: recipients,
        subject,
        htmlContent: html
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        },
        timeout: 5000
      }
    );
  } catch (err) {
    const errorMsg =
      err.response?.data || err.message || "Unknown Brevo error";
    throw new Error(`Brevo email failed: ${JSON.stringify(errorMsg)}`);
  }
};
