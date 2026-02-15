const mongoose = require("mongoose");
const Communication = require("../../../models/Communication");
const CommunicationMessage = require("../../../models/CommunicationMessage");
const Domain = require("../../../models/domain");
const User = require("../../../models/user");
const { sendEmail } = require("../../utils/sendEmail");
const { decryptData } = require("../../middlewares/crypto"); // adjust path if needed

exports.startConversation = async (req, res) => {
  try {
    const buyerIdStr = req.user.id;
    if (!buyerIdStr) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { domainId, message, sendCopy } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const buyerId = new mongoose.Types.ObjectId(buyerIdStr);

    const buyer = await User.findById(buyerId)
      .select("email")
      .lean();

    if (!buyer || !buyer.email) {
      return res.status(401).json({ message: "Buyer email not found" });
    }
    const buyerEmail = buyer.email;
    const domain = await Domain.findById(domainId)
      .select("userId domain");
    const decryptedDomain = decryptData(domain.domain);


    if (!domain || !domain.userId) {
      return res.status(404).json({ message: "Domain or seller not found" });
    }

    const sellerId = domain.userId;
    const communication = await Communication.findOneAndUpdate(
      { domainId, buyerId, sellerId },
      { $setOnInsert: { domainId, buyerId, sellerId } },
      { new: true, upsert: true }
    );
    if (!communication.isActive) {
      return res.status(403).json({ message: "Conversation is closed" });
    }

    await CommunicationMessage.create({
      communicationId: communication._id,
      senderId: buyerId,
      senderRole: "buyer",
      message
    });

    communication.lastMessageAt = new Date();
    await communication.save();

    if (sendCopy === true) {
      await sendEmail({
        to: buyerEmail,
        subject: `Copy of your message about ${decryptedDomain}`,
        html: `
          <p>This is a copy of your message sent on <strong>Domz</strong> regarding:</p>
          <blockquote>${message}</blockquote>
          <p>
            You can continue the conversation from your dashboard.
          </p>
        `
      });
    }

    res.status(201).json({
      success: true,
      communicationId: communication._id
    });

  } catch (err) {
    console.error("startConversation error:", err);
    res.status(500).json({ message: "Failed to start conversation" });
  }
};

exports.getInbox = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Communication.find({
      $or: [{ buyerId: userId }, { sellerId: userId }]
    })
      .populate("domainId", "domain")          // encrypted domain
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .sort({ lastMessageAt: -1 })
      .lean();

    const grouped = {};

    for (const c of conversations) {
      if (!c.domainId) continue;

      const domainKey = c.domainId._id.toString();

      if (!grouped[domainKey]) {
        grouped[domainKey] = {
          domainId: domainKey,
          domain: decryptData(c.domainId.domain), // ✅ DECRYPT HERE
          conversations: []
        };
      }

      const otherUser =
        c.buyerId._id.toString() === userId
          ? c.sellerId
          : c.buyerId;

      grouped[domainKey].conversations.push({
        conversationId: c._id,
        user: otherUser?.name || otherUser?.email || "Unknown",
        lastMessageAt: c.lastMessageAt
      });
    }

    res.status(200).json(Object.values(grouped));
  } catch (err) {
    console.error("getInbox error:", err);
    res.status(500).json({ message: "Failed to load inbox" });
  }
};

exports.getMessages = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; 


  const communication = await Communication.findById(id);
  if (!communication) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  // Access control
  if (
    communication.buyerId.toString() !== userId &&
    communication.sellerId.toString() !== userId
  ) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const messages = await CommunicationMessage.find({
    communicationId: id
  })
    .sort({ createdAt: 1 })
    .lean();
  const formatted = messages.map(m => ({
    _id: m._id,
    message: m.message,
    createdAt: m.createdAt,
    isMine: m.senderId.toString() === userId
  }));

  res.json(formatted);
};



exports.replyToConversation = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  if (!message?.trim()) {
    return res.status(400).json({ message: "Message is required" });
  }

  const communication = await Communication.findById(id);
  if (!communication || !communication.isActive) {
    return res.status(404).json({ message: "Conversation closed" });
  }

  let role;
  if (communication.buyerId.toString() === userId) role = "buyer";
  else if (communication.sellerId.toString() === userId) role = "seller";
  else return res.status(403).json({ message: "Forbidden" });

  await CommunicationMessage.create({
    communicationId: id,
    senderId: userId,
    senderRole: role,
    message: message.trim()
  });

  communication.lastMessageAt = new Date();
  await communication.save();

  res.json({ success: true });
};
