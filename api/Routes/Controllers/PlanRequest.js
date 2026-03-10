const planRequestSchema = require('../../../models/planRequestSchema')
const userSchema = require('../../../models/user')
const PlanSchema = require('../../../models/packages')
const { packages } = require('../../middlewares/PackagePlan')
const { selectPlanSchema } = require("../../middlewares/PackagePlan");
const PlanRequest = require("../../../models/planRequestSchema");


// exports.planRequest = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const { planTitle } = req.body;

//     if (!planTitle) {
//       return res.status(400).json({
//         status: false,
//         message: "Plan is required"
//       });
//     }

//     const selectedPlan = packages.find(p => p.title === planTitle);
//     if (!selectedPlan) {
//       return res.status(400).json({
//         status: false,
//         message: "Invalid plan selected"
//       });
//     }

//     // 🔥 BLOCK if user already has an active plan
//     const activePlan = await PlanSchema.findOne({
//       userId,
//       endingDate: { $gt: new Date() },
//       status: "active"
//     });

//     if (activePlan) {
//       return res.status(403).json({
//         status: false,
//         message: "You already have an active plan. For any customization please contact support."
//       });
//     }

//     const existingRequest = await planRequestSchema.findOne({
//       userId,
//       status: "Pending"
//     });

//     if (existingRequest) {
//       return res.status(409).json({
//         status: false,
//         message: "You already have a pending plan request"
//       });
//     }

//     const request = await planRequestSchema.create({
//       userId,
//       planTitle: selectedPlan.title,
//       price: selectedPlan.price,
//       per: selectedPlan.per,
//       featureLimit: selectedPlan.feature,
//       status: "Pending"
//     });
//     return res.status(201).json({
//       status: true,
//       message: "Plan request submitted successfully",
//     });

//   } catch (error) {
//     console.error("Plan request error:", error);
//     return res.status(500).json({
//       status: false,
//       message: "Failed to submit plan request"
//     });
//   }
// };

exports.planRequest = async (req, res) => {
  try {
    const userId = req.user?.id;

    const {
      name,
      email,
      phone,
      domains,
      sellerType,
      website,
      social,
      marketplace,
      portfolio,
      comments
    } = req.body;

    if (!name || !email || !domains || !sellerType) {
      return res.status(400).json({
        status: false,
        message: "Required fields are missing"
      });
    }

    const existingRequest = await PlanRequest.findOne({
      userId,
      status: "Pending"
    });

    if (existingRequest) {
      return res.status(409).json({
        status: false,
        message: "You already have a pending application"
      });
    }

    await PlanRequest.create({
      userId,
      name,
      email,
      phone,
      domains,
      sellerType,
      website,
      social,
      marketplace,
      portfolio,
      comments,
      status: "Pending"
    });

    return res.status(201).json({
      status: true,
      message: "Application submitted successfully"
    });

  } catch (error) {
    console.error("Application error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to submit application"
    });
  }
};
exports.getAllPlanRequests = async (req, res) => {
  try {

    const [applications, pendingCount] = await Promise.all([
      PlanRequest
        .find()
        .populate("userId", "name email")
        .sort({ createdAt: -1 }),

      PlanRequest.countDocuments({ status: "Pending" })
    ]);

    return res.status(200).json({
      status: true,
      total: applications.length,
      pendingCount,
      data: applications
    });

  } catch (error) {
    console.error("Fetch applications error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch applications"
    });
  }
};

exports.approvePlanAdmin = async (req, res) => {
  try {
    const { userId, domains } = req.body;

    if (!userId || !domains) {
      return res.status(400).json({
        message: "userId and domains are required"
      });
    }

    const domainLimit = Number(domains);

    if (isNaN(domainLimit)) {
      return res.status(400).json({
        message: "Invalid domain number"
      });
    }

    // Check existing active plan
    const existingPlan = await PlanSchema.findOne({
      userId,
      status: "active",
      endingDate: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    // Expire current plan if exists
    if (existingPlan) {
      existingPlan.status = "expired";
      existingPlan.endingDate = new Date();
      await existingPlan.save();
    }

    // Plan duration
    const startDate = new Date();
    const durationInMonths = 1;

    const endingDate = new Date(startDate);
    endingDate.setMonth(startDate.getMonth() + durationInMonths);

    // Create new Domz plan
    const newPlan = await PlanSchema.create({
      userId,
      title: "Domz Approved Plan",
      price: 0,
      per: "Month",
      feature: domainLimit,
      durationInMonths: 1,
      startDate,
      endingDate,
      status: "active"
    });

    // Attach plan to user
    await userSchema.findByIdAndUpdate(userId, {
      $push: { plans: newPlan._id }
    });

    // Update request status
    await PlanRequest.findOneAndUpdate(
      {
        userId,
        domains,
        status: "Pending"
      },
      {
        status: "Approved"
      }
    );

    return res.status(201).json({
      message: "Plan approved successfully",
      plan: newPlan
    });

  } catch (error) {
    console.error("Approve domain plan error:", error);

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

exports.upgradePlanRequest = async (req, res) => {
  try {
    const userId = req.user.id;
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

    // ✅ Must have active plan
    const activePlan = await PlanSchema.findOne({
      userId,
      endingDate: { $gt: new Date() },
      status: "active"
    });

    if (!activePlan) {
      return res.status(403).json({
        status: false,
        message: "You must have an active plan to upgrade"
      });
    }

    // ❌ Prevent downgrade
    if (selectedPlan.feature <= activePlan.feature) {
      return res.status(400).json({
        status: false,
        message: "You can only upgrade to a higher plan"
      });
    }

    // ❌ Only one pending request
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

    await planRequestSchema.create({
      userId,
      planTitle: selectedPlan.title,
      price: selectedPlan.price,
      per: selectedPlan.per,
      featureLimit: selectedPlan.feature,
      type: "UPGRADE",              // ⭐ IMPORTANT
      status: "Pending"
    });

    return res.status(201).json({
      status: true,
      message: "Upgrade request submitted successfully"
    });

  } catch (error) {
    console.error("Upgrade request error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to submit upgrade request"
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