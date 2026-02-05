// netlify/functions/sendEmail.js
// const { Resend } = require("resend");

// exports.handler = async (req,res) => {
//   try {
//     const { name, email, subject, message } = req.body;

//     if (!email || !subject || !message) {
//       return res.status(400).json({ status: false, message: "Missing required fields" });
//     }

//     const resend = new Resend(process.env.RESEND_API_KEY)

//     const data = await resend.emails.send({
//       from: `${name} <onboarding@resend.dev>`,
//       to: process.env.EMAIL_USER, // your receiving email
//       reply_to: email,
//       subject,
//       html: `
//         <div style="font-family: Arial; padding: 12px;">
//           <h2>New Contact Message</h2>
//           <p><strong>Name:</strong> ${name}</p>
//           <p><strong>Email:</strong> ${email}</p>
//           <p><strong>Subject:</strong> ${subject}</p>
//           <p><strong>Message:</strong></p>
//           <p>${message}</p>
//         </div>
//       `,
//     });
//     return res.status(200).json({ status: false, message: "Email Successfully Sent" });
//   } catch (error) {
//     return res.status(500).json({ status: false, message: "Failed to send email" });
//   }
// };


const { sendEmail } = require("../../utils/sendEmail");


exports.handler = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body; // ✅ EXPRESS WAY

    if (!email || !subject || !message) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields",
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
      replyTo: email, // optional (recommended)
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
