const Domain = require("../../../models/domain");
const Communication = require("../../../models/Communication");
const crypto = require("crypto");

exports.sendEmailToSeller = async (req, res) => {
  try {
    const { domainId, buyerEmail } = req.body;
    if (!domainId || !buyerEmail) {
      return res.status(400).json({
        message: "domainId and buyerEmail are required"
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return res.status(400).json({
        message: "Invalid email address"
      });
    }
    const domain = await Domain.findById(domainId).populate("userId");
    if (!domain) {
      return res.status(404).json({ message: "Domain not found" });
    }

    if (!domain.isChatActive) {
      return res.status(403).json({
        message: "Chat is disabled for this domain"
      });
    }

    const sellerEmail = domain.userId.email;
    const threadId = crypto
      .createHash("sha256")
      .update(`${domainId}:${buyerEmail}`)
      .digest("hex")
      .slice(0, 12);

    const PROXY_DOMAIN = process.env.PROXY_DOMAIN;
    const buyerProxy = `buyer-${threadId}@${PROXY_DOMAIN}`;
    const sellerProxy = `seller-${threadId}@${PROXY_DOMAIN}`;


    await Communication.findOneAndUpdate(
      { domainId, buyerEmail, isActive: true },
      {
        domainId,
        buyerEmail,
        sellerEmail,
        buyerProxy,
        sellerProxy,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      proxyEmail: sellerProxy
    });
  } catch (err) {
    console.error("sendEmailToSeller error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};
