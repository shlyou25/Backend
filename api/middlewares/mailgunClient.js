const FormData = require("form-data");
const Mailgun = require("mailgun.js");

const mailgun = new Mailgun(FormData);

module.exports = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
  url: process.env.MAILGUN_API_URL || "https://api.mailgun.net", 
});
