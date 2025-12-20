const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendEmail = async ({ to, subject, html }) => {
  await sgMail.send({
    to,
    from: process.env.EMAIL_FROM,
    subject,
    html
  });
};
