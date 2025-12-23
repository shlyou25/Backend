const userSchema = require('../../../models/user');
const Plan = require("../../../models/packages");
const { packages } = require("../../middlewares/PackagePlan");
const { selectPlanSchema } = require("../../middlewares/PackagePlan");


exports.getplansbyuser = async (req, res) => {
  try {
    const userId = req.user.id;
    const userWithPlans = await userSchema
      .findById(userId)
      .populate({
        path: "plans",
        select: 'title price per feature startDate endingDate -_id'
      })
      .exec();

    if (!userWithPlans) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    res.status(200).json({
      status: true,
      plans: userWithPlans.plans,
      message: 'Plans fetched successfully'
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error fetching plans',
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

exports.getAllPlans=async (req,res)=>{
  try {
    const plans=await Plan.find({role:'user'})
    .populate("userId","email name")
    .sort({createdAt:-1})
    .lean();
    return res.status(200).json({
      success:true,
      count:plans.length,
      plans
    })
  } catch (error) {
    if(process.env.NODE_ENV!='production'){
      console.log("Error getting plans",error.message);
    }
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plans"
    });
  }
}