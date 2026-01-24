const Subscriber = require('../../../models/subscribe')
const User = require("../../../models/user");

exports.subscribe = async (req, res) => {
  try {
    let email = null; 
    let userId = null;
    if (req.user?.id) {
      const user = await User.findById(req.user.id).select(
        "email isActive isEmailVerified"
      );
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid user",
        });
      }
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "User account is inactive",
        });
      }
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email first",
        });
      }

      email = user.email;
      userId = user._id;
    }
    if (!email) {
      email = req.body.email;
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
    const existingSubscriber = await Subscriber.findOne({
      $or: [{ email }, ...(userId ? [{ userId }] : [])],
    });

    if (existingSubscriber) {
      return res.status(409).json({
        success: false,
        message: "Already subscribed",
      });
    }
    await Subscriber.create({
      email,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Subscribed successfully",
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
