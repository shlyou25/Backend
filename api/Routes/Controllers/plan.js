const userSchema = require('../../../models/user');
const Plan = require("../../../models/packages");
const { packages,adminPlanSchema,editPlanSchema } = require("../../middlewares/PackagePlan");
const { selectPlanSchema } = require("../../middlewares/PackagePlan");



exports.getplansbyuser = async (req, res) => {
  try {
    const userId = req.user.id;
    const plans = await Plan.find({ userId })
      .select("title price per feature startDate endingDate status durationInMonths")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      status: true,
      plans,
      message: "Plans fetched successfully"
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching plans",
      error: error.message
    });
  }
};
exports.addPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    // Validate input
    const { error, value } = selectPlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message
      });
    }
    const { title } = value;
    // Match selected plan
    const selectedPlan = packages.find(p => p.title === title);
    if (!selectedPlan) {
      return res.status(400).json({
        message: "Invalid plan selected"
      });
    }
    // Check for active plan
    const existing = await Plan.findOne({ userId })
      .sort({ createdAt: -1 });

    if (existing && existing.endingDate > new Date()) {
      return res.status(400).json({
        message: "You already have an active plan"
      });
    }

    // Server-controlled dates
    const startDate = new Date();
    const endingDate = new Date();
    endingDate.setMonth(endingDate.getMonth() + 1);

    // Create plan
    const newPlan = await Plan.create({
      userId,
      title: selectedPlan.title,
      price: selectedPlan.price,
      per: selectedPlan.per,
      feature: selectedPlan.feature,
      startDate,
      endingDate
    });

    // Link plan to user
    await userSchema.findByIdAndUpdate(
      userId,
      { $push: { plans: newPlan._id } }
    );

    res.status(201).json({
      message: "Plan activated successfully",
      plan: newPlan
    });

  } catch (error) {
    console.error("Add plan error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
};



exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find()
      .populate({
        path: "userId",
        match: { role: "user" },
        select: "email name role"
      })
      .sort({ createdAt: -1 })
      .lean();

    const filteredPlans = plans.filter(p => p.userId);

    return res.status(200).json({
      success: true,
      count: filteredPlans.length,
      plans: filteredPlans
    });
  } catch (error) {
    console.error("Error getting plans", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plans"
    });
  }
};


exports.adminAssignPlan = async (req, res) => {
  try {
    // ✅ Validate request body
    const { error, value } = adminPlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message
      });
    }

    let { userId, title, feature, durationInMonths } = value;

    // ✅ Ensure numbers
    feature = Number(feature);
    durationInMonths = Number(durationInMonths);

    // ✅ Check user
    const user = await userSchema.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Prevent overlapping active plans
    const existing = await Plan.findOne({ userId })
      .sort({ createdAt: -1 });

    if (existing && existing.endingDate > new Date()) {
      return res.status(400).json({
        message: "User already has an active plan"
      });
    }

    // ✅ Calculate dates
    const startDate = new Date();
    const endingDate = new Date();
    endingDate.setMonth(endingDate.getMonth() + durationInMonths);
    const newPlan = await Plan.create({
      userId,
      title,
      price: 0,              // admin assigned
      per: "Month",          // ✅ ENUM SAFE
      feature,
      durationInMonths,      // ✅ REQUIRED FIELD
      startDate,
      endingDate
    });

    return res.status(201).json({
      message: "Plan assigned successfully",
      plan: newPlan
    });

  } catch (error) {
    console.error("Admin assign plan error:", error);
    return res.status(500).json({
      message: "Failed to assign plan"
    });
  }
};



exports.adminEditPlan = async (req, res) => {
  try {
    const { error, value } = editPlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message
      });
    }

    const { planId, feature, extendByMonths } = value;

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        message: "Plan not found"
      });
    }

    if (plan.status !== "active") {
      return res.status(400).json({
        message: "Only active plans can be edited"
      });
    }

    // ✅ Feature can increase, decrease, or be zero
    if (feature !== undefined) {
      plan.feature = feature;
    }

    // ✅ Extend months (only if > 0)
    if (extendByMonths && extendByMonths > 0) {
      plan.durationInMonths += extendByMonths;

      const newEndingDate = new Date(plan.endingDate);
      newEndingDate.setMonth(
        newEndingDate.getMonth() + extendByMonths
      );
      plan.endingDate = newEndingDate;
    }

    await plan.save();

    return res.status(200).json({
      message: "Plan updated successfully",
      plan
    });

  } catch (error) {
    console.error("Edit plan error:", error);
    return res.status(500).json({
      message: "Failed to update plan"
    });
  }
};


