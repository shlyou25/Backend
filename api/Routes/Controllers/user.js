const User = require("../../../models/user");

exports.getallUsers = async (req, res) => {
  try {
    const users = await User.find({role:'user'}, "name email").lean();
    if (!users.length) {
      return res.status(404).json({
        status: false,
        message: "No users found"
      });
    }
    res.status(200).json({
      status: true,
      users,
      message: "Users fetched successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
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

