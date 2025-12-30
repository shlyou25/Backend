//admin
const User = require("../../../models/user");
const Plan = require("../../../models/packages");
const Domain = require("../../../models/domain");

exports.getUserOverview = async (req, res) => {
  try {
    // 🔐 Admin-only check (extra safety)
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // 1️⃣ Get all users
    const users = await User.find({})
      .select("name email phoneNumber")
      .lean();

    // 2️⃣ Get all active plans
    const plans = await Plan.find({
      endingDate: { $gt: new Date() } // active only
    }).lean();

    // 3️⃣ Get domain counts grouped by user
    const domainCounts = await Domain.aggregate([
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 }
        }
      }
    ]);
    // 4️⃣ Convert helpers to maps (O(1) access)
    const planMap = {};
    plans.forEach(plan => {
      planMap[String(plan.userId)] = plan;
    });

    const domainMap = {};
    domainCounts.forEach(d => {
      domainMap[String(d._id)] = d.count;
    });

    // 5️⃣ Final response structure
    const result = users.map(user => {
      const activePlan = planMap[String(user._id)];

      return {
        userId: user._id,
        name: user.name || null,
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        activePlan: activePlan ? activePlan.title : null,
        planActivationDate: activePlan ? activePlan.startDate : null,
        planEndingDate: activePlan ? activePlan.endingDate : null,
        numberOfDomains: domainMap[String(user._id)] || 0
      };
    });

    return res.status(200).json({
      success: true,
      totalUsers: result.length,
      users: result
    });

  } catch (error) {
    console.error("Admin user overview error:", error.message);
    return res.status(500).json({ message: "Failed to fetch user overview" });
  }
};
