const crypto = require("crypto");

function verifyMailgunSignature(req) {
  const { timestamp, token, signature } = req.body;

  const hmac = crypto
    .createHmac("sha256", process.env.MAILGUN_WEBHOOK_SIGNING_KEY)
    .update(timestamp + token)
    .digest("hex");

  return hmac === signature;
}
