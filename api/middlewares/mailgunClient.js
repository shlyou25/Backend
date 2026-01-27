const FormData = require("form-data");
const Mailgun = require("mailgun.js");




const mailgun = new Mailgun(FormData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY, // REQUIRED
  url: process.env.MAILGUN_API_URL || "https://api.mailgun.net",
});

module.exports = mg;
