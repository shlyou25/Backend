const planRequestSchema =require('../../../models/planRequestSchema')
const {packages} =require('../../middlewares/PackagePlan')
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
    const requests = await planRequestSchema
      .find()
      .populate("userId", "name email") // optional
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      count: requests.length,
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
