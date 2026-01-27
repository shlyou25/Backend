const Domain = require("../../../models/domain");
const mailgun = require("../../middlewares/mailgunClient"); // your mg client
const Communication = require("../../../models/Communication");
const crypto = require("crypto");

exports.sendEmailToSeller = async (req, res) => {
  try {
    const { domainId, buyerEmail } = req.body;

    if (!domainId || !buyerEmail) {
      return res.status(400).json({
        message: "domainId and buyerEmail are required",
      });
    }

    const normalizedBuyerEmail = buyerEmail.toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedBuyerEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const domain = await Domain.findById(domainId).populate("userId");
    if (!domain) {
      return res.status(404).json({ message: "Domain not found" });
    }

    if (!domain.isChatActive) {
      return res.status(403).json({ message: "Chat disabled for this domain" });
    }

    const sellerEmail = domain.userId.email.toLowerCase();

    // 🔁 Reuse existing conversation if it exists
    let comm = await Communication.findOne({
      domainId,
      buyerEmail: normalizedBuyerEmail,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!comm) {
      const threadId = crypto
        .createHash("sha256")
        .update(`${domainId}:${normalizedBuyerEmail.trim()}`)
        .digest("hex")
        .slice(0, 12);


      const PROXY_DOMAIN = process.env.PROXY_DOMAIN; // mg.domz.com

      comm = await Communication.create({
        domainId,
        buyerEmail: normalizedBuyerEmail,
        sellerEmail,
        buyerProxy: `buyer-${threadId}@${PROXY_DOMAIN}`,
        sellerProxy: `seller-${threadId}@${PROXY_DOMAIN}`,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    return res.json({
      success: true,
      proxyEmail: comm.sellerProxy,
    });
  } catch (err) {
    console.error("sendEmailToSeller error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

function verifyMailgunSignature(req) {
  const { timestamp, token, signature } = req.body;

  const hmac = crypto
    .createHmac("sha256", process.env.MAILGUN_WEBHOOK_SIGNING_KEY)
    .update(timestamp + token)
    .digest("hex");

  return hmac === signature;
}

exports.mailgunInbound = async (req, res) => {
  if (!verifyMailgunSignature(req)) {
    console.warn("Invalid Mailgun signature");
    return res.sendStatus(401);
  }

  try {
    const {
      recipient,
      sender,
      subject,
      body_plain,
      "message-id": messageId,
    } = req.body;

    if (!recipient) return res.sendStatus(200);

    const proxyEmail = recipient.toLowerCase();

    const comm = await Communication.findOne({
      isActive: true,
      expiresAt: { $gt: new Date() },
      $or: [
        { buyerProxy: proxyEmail },
        { sellerProxy: proxyEmail },
      ],
    });

    if (!comm) {
      console.warn("No proxy mapping for:", proxyEmail);
      return res.sendStatus(200);
    }

    const isBuyerToSeller = proxyEmail === comm.sellerProxy;

    const toEmail = isBuyerToSeller
      ? comm.sellerEmail
      : comm.buyerEmail;

    const replyTo = isBuyerToSeller
      ? comm.buyerProxy
      : comm.sellerProxy;

    await mailgun.messages.create(process.env.MAILGUN_DOMAIN, {
      from: `Domz Proxy <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: toEmail,
      subject: subject || "New message",
      text: body_plain || "",
      "h:Reply-To": replyTo,
    });


    return res.sendStatus(200);
  } catch (err) {
    console.error("Inbound mail error:", err);
    return res.sendStatus(200); // important: never 500 Mailgun
  }
};

