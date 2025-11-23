const nodemailer = require("nodemailer");

// Create reusable transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,   // your Gmail address
    pass: process.env.EMAIL_PASS    // your Gmail app password
  }
});

// Send email function
async function sendContactEmail(userEmail, subject, message,name) {
  console.log(userEmail, subject, message,name);
  try {
    const info = await transporter.sendMail({
      from: `${name} <${process.env.EMAIL_USER}>`,  // sender address
      to: process.env.EMAIL_USER,                          // always send to your Gmail
      replyTo: userEmail,                                  // reply-to user email
      subject: subject,
      text: message,
      html: `<p>${message}</p>`
    });
    return info.messageId;
  } catch (error) {
    console.error("Error sending email:", error);
    return null;
  }
}
// Express route controller to handle send email request
exports.sendEmail = async (req, res, next) => {
 
  try {
    const { name, email, subject, message } = req.body;
     console.log(email, subject, message,name);
    
    if (!email || !subject || !message) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }
    const messageId = await sendContactEmail(email, subject, message,name);

    if (!messageId) {
      return res.status(500).json({ status: 'error', message: 'Failed to send email' });
    }

    res.status(200).json({ status: 'success', message: 'Email Successfully Sent', messageId });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to send email', error: err.message });
  }
};
