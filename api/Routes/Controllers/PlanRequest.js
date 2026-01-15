const planRequestSchema = require('../../../models/planRequestSchema')
const userSchema = require('../../../models/user')
const PlanSchema = require('../../../models/packages')
const { packages } = require('../../middlewares/PackagePlan')
const { selectPlanSchema } = require("../../middlewares/PackagePlan");
const PlanRequest = require("../../../models/planRequestSchema");


exports.planRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { planTitle } = req.body;

    if (!planTitle) {
      return res.status(400).json({
        status: false,
        message: "Plan is required"
      });
    }

    const selectedPlan = packages.find(p => p.title === planTitle);
    if (!selectedPlan) {
      return res.status(400).json({
        status: false,
        message: "Invalid plan selected"
      });
    }

    // 🔥 BLOCK if user already has an active plan
    const activePlan = await PlanSchema.findOne({
      userId,
      endingDate: { $gt: new Date() },
      status: "active"
    });

    if (activePlan) {
      return res.status(403).json({
        status: false,
        message: "You already have an active plan. For any customization please contact support."
      });
    }

    const existingRequest = await planRequestSchema.findOne({
      userId,
      status: "Pending"
    });

    if (existingRequest) {
      return res.status(409).json({
        status: false,
        message: "You already have a pending plan request"
      });
    }

    const request = await planRequestSchema.create({
      userId,
      planTitle: selectedPlan.title,
      price: selectedPlan.price,
      per: selectedPlan.per,
      featureLimit: selectedPlan.feature,
      status: "Pending"
    });
    return res.status(201).json({
      status: true,
      message: "Plan request submitted successfully",
    });

  } catch (error) {
    console.error("Plan request error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to submit plan request"
    });
  }
};

exports.getAllPlanRequests = async (req, res) => {
  try {
    const [requests, pendingCount] = await Promise.all([
      planRequestSchema
        .find()
        .populate("userId", "name email")
        .sort({ createdAt: -1 }),

      planRequestSchema.countDocuments({ status: "Pending" })
    ]);

    return res.status(200).json({
      status: true,
      total: requests.length,
      pendingCount,
      data: requests
    });

  } catch (error) {
    console.error("Fetch plan requests error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch plan requests"
    });
  }
};

exports.approvePlanAdmin = async (req, res) => {
  try {
    const { userId, title } = req.body;

    if (!userId || !title) {
      return res.status(400).json({
        message: "userId and plan title are required"
      });
    }

    // Validate plan name only
    const { error } = selectPlanSchema.validate({ title });
    if (error) {
      return res.status(400).json({
        message: error.details[0].message
      });
    }

    // Find allowed plan
    const selectedPlan = packages.find(p => p.title === title);
    if (!selectedPlan) {
      return res.status(400).json({
        message: "Invalid plan selected"
      });
    }

    // Prevent overlapping active plan
    const existing = await PlanSchema.findOne({ userId })
      .sort({ createdAt: -1 });

    if (existing && existing.endingDate > new Date()) {
      return res.status(400).json({
        message: "User already has an active plan"
      });
    }

    // 🔥 SERVER-CONTROLLED DURATION
    const startDate = new Date();
    const durationInMonths = 1; // ← RULE
    const endingDate = new Date(startDate);
    endingDate.setMonth(startDate.getMonth() + durationInMonths);

    // Create plan
    const newPlan = await PlanSchema.create({
      userId,
      title: selectedPlan.title,
      price: selectedPlan.price,
      per: selectedPlan.per,
      feature: selectedPlan.feature,
      durationInMonths,        // required by schema
      startDate,
      endingDate
    });

    // Attach to user
    await userSchema.findByIdAndUpdate(userId, {
      $push: { plans: newPlan._id }
    });

    // Approve matching plan request
    await PlanRequest.findOneAndUpdate(
      { userId, planTitle: title, status: "Pending" },
      { status: "Approved" }
    );

    return res.status(201).json({
      message: "Plan activated for 1 month",
      plan: newPlan
    });

  } catch (error) {
    console.error("Add plan error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

exports.rejectPlanRequest = async (req, res) => {
  try {
    const { userId, planTitle } = req.body;

    if (!userId || !planTitle) {
      return res.status(400).json({
        status: false,
        message: "userId and planTitle are required"
      });
    }
    const request = await planRequestSchema.findOne({
      userId,
      planTitle,
      status: "Pending"
    });

    if (!request) {
      return res.status(404).json({
        status: false,
        message: "No pending plan request found"
      });
    }
    request.status = "Rejected";
    await request.save();

    return res.status(200).json({
      status: true,
      message: "Plan request rejected successfully",
      data: request
    });

  } catch (error) {
    console.error("Reject plan request error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to reject plan request"
    });
  }
};



exports.deleterequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Id Required"
      })
    }
    const request = await planRequestSchema.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request Not Found",
      })
    }
    await planRequestSchema.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Plan Request Deleted Successfully"
    })
  }
  catch (error) {
    console.error("deleteDomain error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}