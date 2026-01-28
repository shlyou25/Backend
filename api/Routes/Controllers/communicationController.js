const Domain = require("../../../models/domain");
const Communication = require("../../../models/Communication");
const mailgun = require("../../middlewares/mailgunClient");
const crypto = require("crypto");

/* ===============================
   CREATE / REUSE PROXY EMAIL
================================ */
exports.sendEmailToSeller = async (req, res) => {
  try {
    const { domainId, buyerEmail } = req.body;
    if (!domainId || !buyerEmail) {
      return res.status(400).json({ message: "domainId and buyerEmail required" });
    }

    const normalizedBuyerEmail = buyerEmail.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedBuyerEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const domain = await Domain.findById(domainId).populate("userId");
    if (!domain || !domain.isChatActive) {
      return res.status(403).json({ message: "Chat disabled" });
    }

    const sellerEmail = domain.userId.email.toLowerCase();

    let comm = await Communication.findOne({
      domainId,
      buyerEmail: normalizedBuyerEmail,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!comm) {
      const threadId = crypto
        .createHash("sha256")
        .update(`${domainId}:${normalizedBuyerEmail}`)
        .digest("hex")
        .slice(0, 12);

      comm = await Communication.create({
        domainId,
        buyerEmail: normalizedBuyerEmail,
        sellerEmail,
        buyerProxy: `buyer-${threadId}@${process.env.PROXY_DOMAIN}`,
        sellerProxy: `seller-${threadId}@${process.env.PROXY_DOMAIN}`,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    return res.json({ success: true, proxyEmail: comm.sellerProxy });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal error" });
  }
};

/* ===============================
   MAILGUN SIGNATURE VERIFY
================================ */
function verifyMailgunSignature(req) {
  const { timestamp, token, signature } = req.body;
  if (!timestamp || !token || !signature) return false;

  const hmac = crypto
    .createHmac("sha256", process.env.MAILGUN_WEBHOOK_SIGNING_KEY)
    .update(timestamp + token)
    .digest("hex");

  return hmac === signature;
}

/* ===============================
   INBOUND EMAIL HANDLER
================================ */
exports.mailgunInbound = async (req, res) => {
  if (!verifyMailgunSignature(req)) {
    return res.sendStatus(401);
  }

  try {
    const { recipient, sender, subject, body_plain } = req.body;
    if (!recipient) return res.sendStatus(200);

    // 🔒 Prevent proxy-to-proxy loop
    if (
      sender.includes(process.env.PROXY_DOMAIN) &&
      recipient.includes(process.env.PROXY_DOMAIN)
    ) {
      return res.sendStatus(200);
    }

    const proxyEmail = recipient.toLowerCase();

    const comm = await Communication.findOne({
      isActive: true,
      expiresAt: { $gt: new Date() },
      $or: [{ buyerProxy: proxyEmail }, { sellerProxy: proxyEmail }],
    });

    if (!comm) return res.sendStatus(200);

    const isBuyerToSeller = proxyEmail === comm.sellerProxy;

    const toEmail = isBuyerToSeller
      ? comm.sellerEmail
      : comm.buyerEmail;

    const replyTo = isBuyerToSeller
      ? comm.buyerProxy
      : comm.sellerProxy;

    await mailgun.messages.create(process.env.MAILGUN_DOMAIN, {
      from: `Domz Proxy <${replyTo}>`,
      to: toEmail,
      subject: subject || "New message",
      text: body_plain || "",
      "h:Reply-To": replyTo,
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("Inbound error:", err);
    return res.sendStatus(200);
  }
};
