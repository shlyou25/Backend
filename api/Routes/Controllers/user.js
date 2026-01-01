const User = require("../../../models/user");
const Plan = require("../../../models/packages");

exports.getallUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("name email isActive createdAt")
      .lean();

    if (!users.length) {
      return res.status(404).json({
        status: false,
        message: "No users found"
      });
    }
    const userIds = users.map(u => u._id);

    const plans = await Plan.aggregate([
      {
        $match: {
          userId: { $in: userIds }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$userId",
          title: { $first: "$title" },
          feature: { $first: "$feature" },
          status: { $first: "$status" },
          endingDate: { $first: "$endingDate" }
        }
      }
    ]);
    const planMap = {};
    plans.forEach(p => {
      planMap[p._id.toString()] = {
        title: p.title,
        feature: p.feature,
        status: p.status,
        endingDate: p.endingDate
      };
    });
    const usersWithPlans = users.map(user => ({
      ...user,
      plan: planMap[user._id.toString()] || null
    }));

    return res.status(200).json({
      status: true,
      users: usersWithPlans,
      message: "Users fetched successfully"
    });

  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      status: false,
      message: "Error fetching users"
    });
  }
};


exports.getuserbyid = async (req, res) => {
  try {
    const userId = req.user.id;

    const userInfo = await User.findById(userId)
      .select("name email phoneNumber")
      .lean();

    if (!userInfo) {
      return res.status(404).json({
        status: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      status: true,
      user: userInfo,
      message: "User information fetched successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Error getting user info"
    });
  }
};

exports.updateuserinfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phoneNumber } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(name && { name }),
          ...(phoneNumber && { phoneNumber })
        }
      },
      { new: true }
    ).select("name email phoneNumber");

    if (!updatedUser) {
      return res.status(404).json({
        status: false,
        message: "User not found"
      });
    }
    res.status(200).json({
      status: true,
      message: "User updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Error updating user info"
    });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { _id, isActive } = req.body;
    if (!_id || typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid data",
      });
    }
    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    user.isActive = isActive;
    await user.save();
    return res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        _id: user._id,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle user status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};