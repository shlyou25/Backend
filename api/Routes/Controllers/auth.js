const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../../models/user");
const { generateOtp, hashOtp } = require("../../utils/otp");
const { sendEmail } = require("../../utils/sendEmail");


exports.register = async (req, res) => {
  try {
    const { email, password, terms } = req.body;

    if (!terms) {
      return res.status(400).json({ message: "Please accept terms & policy" });
    }

    if (!email || !password || !validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const normalizedEmail = email.toLowerCase();

    const exists = await User.exists({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ message: "Account already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      email: normalizedEmail,
      password: hashedPassword
    });

    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Register error:", error.message);
    }
    return res.status(500).json({ message: "Registration failed" });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password, terms } = req.body;
    console.log(email,password,terms);
    
    // 1️⃣ Basic validation
    if (!terms) {
      return res.status(400).json({ message: "Please accept terms & policy" });
    }

    if (!email || !password || !validator.isEmail(email)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2️⃣ Fetch user
    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+password email role tokenVersion mustChangePassword");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Forced password change
   if (user.mustChangePassword) {
  const tempToken = jwt.sign(
    {
      sub: user._id.toString(),
      purpose: "PASSWORD_CHANGE",
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "10m",
      algorithm: "HS256"
    }
  );

  res.cookie("pwd_change_token", tempToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 10 * 60 * 1000
  });

  return res.status(403).json({
    code: "PASSWORD_CHANGE_REQUIRED",
    message: "Password change required"
  });
}
    // 🔐 4️⃣ ADMIN → EMAIL OTP (2FA)
    if (user.role === "admin") {
      const otp = generateOtp();

      user.adminOtpHash = hashOtp(otp);
      user.adminOtpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
      await user.save();

      await sendEmail({
        to: user.email,
        subject: "Admin Login Verification Code",
        html: `
          <h2>Admin Login Verification</h2>
          <p>Your one-time verification code is:</p>
          <h1>${otp}</h1>
          <p>This code expires in 5 minutes.</p>
          <p>If this wasn't you, please secure your account.</p>
        `
      });

      return res.status(200).json({
        code: "ADMIN_OTP_REQUIRED",
        message: "OTP sent to your email"
      });
    }

    // 5️⃣ NORMAL USER → ISSUE JWT
    const token = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        tokenVersion: user.tokenVersion
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        algorithm: "HS256"
      }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      maxAge: 60 * 60 * 1000
    });

    return res.status(200).json({ message: "Login successful" });

  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Login error:", error.message);
    }
    return res.status(500).json({ message: "Login failed" });
  }
};

exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { tokenVersion: 1 }
    });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax"
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Logout error:", error.message);
    }
    return res.status(500).json({ message: "Logout failed" });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("email role name mustChangePassword")
      .lean();

    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

    return res.status(200).json({
      authenticated: true,
      user
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Me error:", error.message);
    }
    return res.status(500).json({ authenticated: false });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ message: "If email exists, code sent" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ message: "If email exists, code sent" });
    }

    const code = generateOtp();

    user.passwordResetCode = hashOtp(code);
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Password Reset Code",
      html: `
        <h2>Password Reset</h2>
        <p>Your code:</p>
        <h1>${code}</h1>
        <p>Expires in 10 minutes</p>
      `
    });

    return res.json({ message: "If email exists, code sent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error sending code" });
  }
};



exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetCode: hashOtp(code),
      passwordResetExpires: { $gt: Date.now() }
    }).select("+passwordResetCode");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion += 1;

    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch {
    return res.status(500).json({ message: "Reset failed" });
  }
};



exports.verifyAdminOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const user = await User.findOne({
      role: "admin",
      adminOtpHash: hashOtp(String(otp)), // ✅ FIX HERE
      adminOtpExpires: { $gt: Date.now() }
    }).select("+adminOtpHash");
  
    console.log(user, "user");

    if (!user) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP
    user.adminOtpHash = undefined;
    user.adminOtpExpires = undefined;
    await user.save();

    // ✅ ISSUE JWT
    const token = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        tokenVersion: user.tokenVersion
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        algorithm: "HS256"
      }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      maxAge: 60 * 60 * 1000
    });
   console.log(token);
   
    return res.status(200).json({
      message: "Admin login successful"
    });

  } catch (error) {
    console.error("Verify OTP error:", error.message);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};


exports.changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: "Weak password" });
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(userId, {
      password: hashed,
      mustChangePassword: false,
      $inc: { tokenVersion: 1 }
    });

    res.clearCookie("pwd_change_token");

    return res.json({
      message: "Password updated. Please login again."
    });

  } catch {
    return res.status(500).json({ message: "Password change failed" });
  }
};
