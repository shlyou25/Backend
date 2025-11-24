const nodemailer = require("nodemailer");

// Create transporter with Gmail App Password
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // MUST be APP PASSWORD
  }
});

// Send email function
async function sendContactEmail(userEmail, subject, message, name) {
  try {
    const info = await transporter.sendMail({
      from: `${name} <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: userEmail,
      subject,
      text: message,
      html: `<p>${message}</p>`
    });

    return info.messageId;
  } catch (error) {
    console.error("Nodemailer Error:", error);
    return null;
  }
}

exports.sendEmail = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    console.log({ name, email, subject, message, },'///////////////////');
    console.log(process.env.EMAIL_USER,
      process.env.EMAIL_PASS,'////////////////////////////////////////');


    if (!email || !subject || !message) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const messageId = await sendContactEmail(email, subject, message, name);

    if (!messageId) {
      return res.status(500).json({ status: 'error', message: 'Failed to send email' });
    }

    res.status(200).json({ status: 'success', message: 'Email Successfully Sent', messageId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to send email' });
  }
};
