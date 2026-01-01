// controllers/paymentController.js
const stripe = require("../../utils/stripe");
const { packages } = require("../../middlewares/PackagePlan");
const createPlanAfterPayment = require('../../utils/addPlan');
const Payment = require("../../../models/payment");
const Plan = require("../../../models/packages");
(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
  try {
    const { planTitle } = req.body;
    const userId = req.user.id;
    // 1️⃣ Validate plan
    const plan = packages.find(p => p.title === planTitle);
    if (!plan) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    // 2️⃣ 🔐 CHECK ACTIVE PLAN (IMPORTANT)
    const existingPlan = await Plan.findOne({ userId })
      .sort({ createdAt: -1 });

    if (existingPlan && existingPlan.endingDate > new Date()) {
      return res.status(409).json({
        code: "ACTIVE_PLAN_EXISTS",
        message: "You already have an active plan. Please upgrade your plan.",
        currentPlan: existingPlan.title,
        expiresOn: existingPlan.endingDate
      });
    }

    // 3️⃣ Stripe uses smallest unit (cents)
    const amount = Math.round(plan.price * 100);

    // 4️⃣ Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      description: `Subscription plan: ${plan.title}`, // ✅ important (India + global safe)
      metadata: {
        userId,
        planTitle
      }
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret
    });

  } catch (error) {
    console.error("Stripe create intent error:", error.message);
    return res.status(500).json({
      message: "Failed to initialize payment"
    });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    // 🔐 Retrieve from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment not successful" });
    }
    // 🔐 HARD SECURITY CHECK
    if (paymentIntent.metadata.userId !== userId) {
      return res.status(403).json({ message: "Payment user mismatch" });
    }

    // 🔁 Idempotency
    let payment = await Payment.findOne({ paymentIntentId });

    if (!payment) {
      payment = await Payment.create({
        userId,
        paymentIntentId,
        planTitle: paymentIntent.metadata.planTitle,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: "succeeded"
      });
    }

    // 🔒 Ownership check
    if (payment.userId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized payment access" });
    }

    // 🛑 Already processed
    if (payment.status === "plan_created") {
      return res.status(200).json({
        message: "Plan already activated"
      });
    }

    // 🔐 Lock payment BEFORE creating plan
    payment.status = "processing";
    await payment.save();

    // ✅ Create plan
    const plan = await createPlanAfterPayment({
      userId,
      planTitle: payment.planTitle
    });

    // ✅ Finalize
    payment.status = "plan_created";
    await payment.save();

    return res.status(200).json({
      message: "Payment verified & plan activated",
      plan
    });

  } catch (error) {
    console.error("Confirm payment error:", error.message);

    return res.status(500).json({
      message:
        "Payment succeeded but plan activation failed. Support has been notified."
    });
  }
};


exports.dummyPayment=async(req,res)=>{
  
}