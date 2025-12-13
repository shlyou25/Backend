const userSchema = require('../../../models/user')

exports.getallUsers = async (req, res) => {
  try {
    const user = await userSchema.find({}, 'name email').exec();
    if (user) {
      res.status(200).json({
        status: true,
        users: user,
        message: 'Users Information Fetched Successfull'
      })
    }
    else {
      res.status(404).json({
        status: false,
        message: 'No User Found'
      })
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error in getting User Info'
    })
  }
}

exports.getuserbyid = async (req, res) => {
  try {
    const user = req.user._id; // Populated by authenticate middleware
    const userInfo = await userSchema.findById(user).select('name email phoneNumber');
    if (user) {
      res.status(200).json({
        status: true,
        user: {
          name: userInfo.name,
          email: userInfo.email,
          phoneNumber: userInfo.phoneNumber
        },
        message: 'User Information Fetched Successfully'
      });
    } else {
      res.status(404).json({
        status: false,
        message: 'No Information Found'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error in getting User Info'
    });
  }
}

exports.updateuserinfo = async (req, res, next) => {
  try {
    const { name, email, phoneNumber } = req.body;


    const user = req.user;

    const updatedUser = await userSchema.findOneAndUpdate(
      { _id: user._id },
      { $set: { name, email, phoneNumber } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: true,
      message: 'User Information Successfully Updated',
      // user: updatedUser,  // optional, include updated data in response
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Error in updating user Information',
    });
  }
};


exports.createAdmin = async (req, res) => {
  try {
    const adminExists = await Users.findOne({ role: "admin" });

    if (!adminExists) {
      const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

      await Users.create({
        _id: new mongoose.Types.ObjectId(),
        email: process.env.ADMIN_EMAIL,
        password: hashed,
        role: "admin",
        isEmailVerified: true
      });

      console.log("🔥 Default admin created");
    } else {
      console.log("Admin already exists.");
    }
  } catch (err) {
    console.error("Admin creation error:", err);
  }
}