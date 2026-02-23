const mongoose = require("mongoose");
const Communication = require("../../../models/Communication");
const CommunicationMessage = require("../../../models/CommunicationMessage");
const Domain = require("../../../models/domain");
const User = require("../../../models/user");
const { sendEmail } = require("../../utils/sendEmail");
const { decryptData } = require("../../middlewares/crypto");

/**
 * ===============================
 * START CONVERSATION
 * ===============================
 */


/**
 * ===============================
 * GET INBOX
 * ===============================
 */
exports.getInbox = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Communication.find({
      $or: [{ buyerId: userId }, { sellerId: userId }]
    })
      .populate("domainId", "domain")
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
          domain: decryptData(c.domainId.domain),
          conversations: []
        };
      }

      const otherUser =
        c.buyerId._id.toString() === userId ? c.sellerId : c.buyerId;

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

/**
 * ===============================
 * GET MESSAGES
 * ===============================
 */
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const communication = await Communication.findById(id);
    if (!communication) {
      return res.status(404).json({ message: "Conversation not found" });
    }

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

    const formatted = messages.map((m) => ({
      _id: m._id,
      message: m.message,
      createdAt: m.createdAt,
      isMine: m.senderId.toString() === userId
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ message: "Failed to load messages" });
  }
};

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

    const buyer = await User.findById(buyerId).select("email").lean();
    if (!buyer?.email) {
      return res.status(401).json({ message: "Buyer email not found" });
    }

    const domain = await Domain.findById(domainId)
      .select("userId domain isMessageNotificationEnabled")
      .populate("userId", "email");

    if (!domain || !domain.userId) {
      return res.status(404).json({ message: "Domain or seller not found" });
    }

    const decryptedDomain = decryptData(domain.domain);
    const sellerId = domain.userId;

    const communication = await Communication.findOneAndUpdate(
      { domainId, buyerId, sellerId },
      { $setOnInsert: { domainId, buyerId, sellerId } },
      { new: true, upsert: true }
    );

    if (!communication.isActive) {
      return res.status(403).json({ message: "Conversation is closed" });
    }

    const newMessage = await CommunicationMessage.create({
      communicationId: communication._id,
      senderId: buyerId,
      senderRole: "buyer",
      message: message.trim()
    });

    communication.lastMessageAt = new Date();
    await communication.save();

    /** ✅ REALTIME */
    const io = req.app.get("io");

    io.to(communication._id.toString()).emit("new_message", {
      _id: newMessage._id.toString(),
      communicationId: communication._id.toString(),
      message: newMessage.message,
      senderId: buyerIdStr.toString(), // ⭐ normalized
      createdAt: newMessage.createdAt
    });

    /** emails */
    if (domain.isMessageNotificationEnabled) {
      await sendEmail({
        to: domain.userId.email,
        subject: `Notification for ${decryptedDomain}`,
        html: `<p>You have received a new message regarding <strong>${decryptedDomain}</strong>.</p>
               <blockquote>${message}</blockquote>`
      });
    }

    if (sendCopy === true) {
      await sendEmail({
        to: buyer.email,
        subject: `Copy of your message about ${decryptedDomain}`,
        html: `<blockquote>${message}</blockquote>`
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

/**
 * ===============================
 * REPLY TO CONVERSATION
 * ===============================
 */
exports.replyToConversation = async (req, res) => {
  try {
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

    const newMessage = await CommunicationMessage.create({
      communicationId: id,
      senderId: userId,
      senderRole: role,
      message: message.trim()
    });

    /** ✅ REALTIME (STRING NORMALIZED) */
    const io = req.app.get("io");

    io.to(id.toString()).emit("new_message", {
      _id: newMessage._id.toString(),
      communicationId: id.toString(),
      message: newMessage.message,
      senderId: userId.toString(), // ⭐ CRITICAL FIX
      createdAt: newMessage.createdAt
    });

    communication.lastMessageAt = new Date();
    await communication.save();

    res.json({ success: true });
  } catch (err) {
    console.error("replyToConversation error:", err);
    res.status(500).json({ message: "Failed to send reply" });
  }
};