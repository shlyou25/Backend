const Subscriber = require('../../../models/subscribe')
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user?.id || null; // if logged in

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const subscriber = await Subscriber.create({
      email,
      userId,
    });

    return res.status(201).json({
      message: "Subscribed successfully",
      subscriber,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Email already subscribed",
      });
    }

    return res.status(500).json({ message: "Server error" });
  }
};
