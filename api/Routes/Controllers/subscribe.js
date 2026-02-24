const Subscriber = require('../../../models/subscribe')
const User = require("../../../models/user");
const crypto = require("crypto");
const sendEmail = require("../../utils/sendEmail"); // your mail helper

exports.subscribe = async (req, res) => {
  try {
    let email = null;
    let userId = null;
    let isGuest = true;

    // ✅ Logged-in user
    if (req.user?.id) {
      const user = await User.findById(req.user.id).select("email");
      email = user.email;
      userId = user._id;
      isGuest = false;
    }

    // ✅ Guest email
    if (!email) {
      email = req.body.email?.toLowerCase().trim();
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // 🔍 Check existing
    const existingSubscriber = await Subscriber.findOne({
      email,
    });

    if (existingSubscriber?.isVerified) {
      return res.status(409).json({
        success: false,
        message: "Already subscribed",
      });
    }

    // ===============================
    // ✅ LOGGED-IN USER → instant subscribe
    // ===============================
    if (!isGuest) {
      await Subscriber.findOneAndUpdate(
        { email },
        {
          email,
          userId,
          isVerified: true,
          verificationToken: null,
          verificationExpires: null,
        },
        { upsert: true, new: true }
      );

      return res.status(201).json({
        success: true,
        message: "Subscribed successfully",
      });
    }

    // ===============================
    // ✅ GUEST USER → send verification email
    // ===============================

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 60 * 24; // 24 hours

    await Subscriber.findOneAndUpdate(
      { email },
      {
        email,
        isVerified: false,
        verificationToken: token,
        verificationExpires: expires,
      },
      { upsert: true, new: true }
    );

    // 🔗 verification link
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-subscription?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Confirm your subscription",
      html: `
        <h2>Confirm Subscription</h2>
        <p>Click below to confirm:</p>
        <a href="${verifyUrl}">Verify Email</a>
        <p>This link expires in 24 hours.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (err) {
    console.error("Subscribe error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
exports.getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: subscribers,
    });
  } catch (err) {
    console.error("Fetch subscribers error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscribers",
    });
  }
};
