const validator=require('validator');
const bcrypt=require('bcryptjs')
const jwt = require('jsonwebtoken');
const mongoose=require('mongoose');
const userScheme=require('../../../models/user')

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, terms } = req.body;
    if (terms !== true)
      return res.status(400).json({ status: false, message: "Please accept the terms & policy" });

    const passwordRegex = /^(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!name || !email || !password || !validator.isEmail(email) || !passwordRegex.test(password))
      return res.status(400).json({ status: false, message: "Invalid credentials" });

    const existingUser = await userScheme.findOne({ email });
    if (existingUser)
      return res.status(400).json({ status: false, message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new userScheme({
      _id: new mongoose.Types.ObjectId(),
      name,
      email,
      password: hashedPassword
    });
    await newUser.save();
    res.status(201).json({ status: true, message: "User successfully registered" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Failed to register" });
  }
};


exports.login = async (req, res, next) => {
  try {
    const { email, password, terms } = req.body;
    console.log(email, password, terms,"email, password, terms");
    
    if (terms !== true) {
      return res.status(400).json({ status: false, message: "Please accept the terms and policy" });
    }

    if (!email || !password || !validator.isEmail(email)) {
      return res.status(400).json({ status: false, message: "Invalid credentials" });
    }

    const user = await userScheme.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ status: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    user.activeToken = token;
    await user.save();
    // HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,                            // prevents JS access
      secure: true, // HTTPS only in production
      sameSite: "None",                        // protect against CSRF
      maxAge: 60 * 60 * 1000                     // 1 hour
    });

    // success response (no token in JSON)
    res.status(200).json({
      status: true,
      message: "Successfully logged in"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Failed to login" });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(400).json({ status: false, message: "No token provided" });
    }
    const user = await userScheme.findOne({ activeToken: token });
    if (user) {
      user.activeToken = null;  
      await user.save();
    }
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict"
    });

    res.status(200).json({ status: true, message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Logout failed" });
  }
};

