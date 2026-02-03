const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../../../models/user");
const { generateOtp, hashOtp } = require("../../utils/otp");
const { sendEmail } = require("../../utils/sendEmail");
const { getCookieOptions } = require("../../utils/cookies");
const { checkAccountLock } = require("../../middlewares/authenticate");



exports.register = async (req, res) => {
  try {
    const { email, password, terms } = req.body;
    // 1️⃣ Validate input
    if (!terms) {
      return res.status(400).json({
        code: "TERMS_REQUIRED",
        message: "Please accept terms & policy"
      });
    }
    if (!email || !password || !validator.isEmail(email)) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Invalid email or password"
      });
    }
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        code: "WEAK_PASSWORD",
        message:
          "Password must be at least 8 characters, 1 uppercase & 1 special character"
      });
    }
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && existingUser.isEmailVerified) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message: "Account already exists"
      });
    }

    // 3️⃣ Generate OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4️⃣ Create or update unverified user
    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        password: hashedPassword,
        emailOtpHash: otpHash,
        emailOtpExpires: Date.now() + 5 * 60 * 1000, // 5 mins
        isEmailVerified: false
      },
      { upsert: true, new: true }
    );

    // 5️⃣ Send OTP email
    await sendEmail({
      to: normalizedEmail,
      subject: "Verify your email",
      html: `
    <h2>Email Verification</h2>
    <p>Your verification code:</p>
    <h1>${otp}</h1>
    <p>This code expires in 5 minutes.</p>
  `
    });

    const verifyToken = jwt.sign(
      {
        sub: user._id.toString(),
        purpose: "EMAIL_VERIFY"
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "10m" }
    );

    res.cookie("verify_token", verifyToken, getCookieOptions());
    return res.status(201).json({
      code: "EMAIL_OTP_SENT",
      message: "OTP sent to your email"
    });

  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({
      code: "REGISTER_FAILED",
      message: "Registration failed"
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, terms } = req.body;

    // 1️⃣ Basic validation
    if (!terms) {
      return res.status(400).json({ message: "Please accept terms & policy" });
    }
    if (!email || !password || !validator.isEmail(email)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // 2️⃣ Fetch user
    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+password email role tokenVersion mustChangePassword isEmailVerified isActive");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log({ email, password, terms });
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before logging in"
      });
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

      const isProd = process.env.NODE_ENV === "production";

      res.cookie("pwd_change_token", tempToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 10 * 60 * 1000
      });

      return res.status(403).json({
        success: false,
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
        to: [user.email, "shlomoyounger1@gmail.com"],
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
        success: false,
        code: "ADMIN_OTP_REQUIRED",
        message: "OTP sent to your email"
      });
    }
    if (!user.isActive && user.role != "admin") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_NOT_ACTIVATED",
        message: "Account Not Activated"
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
      path: "/",
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 60 * 60 * 1000
    });

    return res.status(200).json({ code: "Logged In", message: "Login successful" });

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
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/"
    });
    return res.status(200).json({
      message: "Logged out successfully"
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Logout error:", error.message);
    }
    return res.status(500).json({
      message: "Logout failed"
    });
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

    // Always return same response
    if (!email) {
      return res.status(200).json({
        code: "RESET_CODE_SENT",
        message: "If email exists, code sent"
      });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        code: "RESET_CODE_SENT",
        message: "If email exists, code sent"
      });
    }

    // 🔒 Check account lock
    const lockStatus = await checkAccountLock(user);
    if (lockStatus.locked) {
      return res.status(423).json({
        code: "ACCOUNT_LOCKED",
        message: "Account temporarily locked. Try again later."
      });
    }

    // 🔐 Generate OTP
    const code = generateOtp();

    user.passwordResetCode = hashOtp(code);
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // 🔑 Reset session token
    const resetToken = jwt.sign(
      {
        sub: user._id.toString(),
        purpose: "PASSWORD_RESET"
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "10m" }
    );

    res.cookie("reset_token", resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 10 * 60 * 1000
    });

    // 📧 Send email
    await sendEmail({
      to: normalizedEmail,
      subject: "Password Reset Code",
      html: `
        <h2>Password Reset</h2>
        <p>Your verification code is:</p>
        <h1>${code}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn’t request this, ignore this email.</p>
      `
    });

    return res.status(200).json({
      code: "RESET_CODE_SENT",
      message: "If email exists, code sent"
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({
      code: "FORGOT_PASSWORD_FAILED",
      message: "Unable to process request"
    });
  }
};



exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const resetToken = req.cookies.reset_token;

    if (!resetToken) {
      return res.status(401).json({
        code: "RESET_SESSION_EXPIRED",
        message: "Password reset session expired"
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET_KEY);
    } catch {
      return res.status(401).json({
        message: "Password reset session expired"
      });
    }

    if (decoded.purpose !== "PASSWORD_RESET_VERIFIED") {
      return res.status(403).json({
        message: "OTP verification required"
      });
    }

    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.tokenVersion += 1; // invalidate all sessions

    await user.save();

    // 🔐 Destroy reset session
    res.clearCookie("reset_token");

    return res.status(200).json({
      message: "Password reset successful. Please login."
    });

  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      message: "Password reset failed"
    });
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
      // secure: isProd,
      // sameSite: isProd ? "None" : "Lax",
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 1000
    });
    return res.status(200).json({
      message: "Admin login successful"
    });

  } catch (error) {
    console.error("Verify OTP error:", error.message);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};


exports.verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user.sub;


    if (!otp) {
      return res.status(400).json({
        code: "OTP_REQUIRED",
        message: "OTP is required"
      });
    }

    const user = await User.findById(userId).select("+emailOtpHash +emailOtpExpires");
    if (!user || !user.emailOtpHash || !user.emailOtpExpires) {
      return res.status(400).json({
        code: "INVALID_OTP",
        message: "Invalid or expired OTP"
      });
    }

    if (user.emailOtpExpires.getTime() < Date.now()) {
      return res.status(400).json({
        code: "INVALID_OTP",
        message: "Invalid or expired OTP"
      });
    }

    const providedHash = crypto
      .createHash("sha256")
      .update(String(otp).trim())
      .digest();

    const storedHash = Buffer.from(user.emailOtpHash, "hex");

    if (
      storedHash.length !== providedHash.length ||
      !crypto.timingSafeEqual(storedHash, providedHash)
    ) {
      return res.status(400).json({
        code: "INVALID_OTP",
        message: "Invalid or expired OTP"
      });
    }

    // ✅ Success
    user.isEmailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    return res.status(200).json({
      code: "EMAIL_VERIFIED",
      message: "Email verified successfully"
    });

  } catch (err) {
    console.error("OTP verify error:", err);
    return res.status(500).json({
      code: "OTP_VERIFY_FAILED",
      message: "Verification failed"
    });
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


exports.resendEmailOtp = async (req, res) => {
  try {
    const verifyToken = req.cookies.verify_token;

    if (!verifyToken) {
      return res.status(401).json({
        code: "VERIFY_SESSION_EXPIRED",
        message: "Verification session expired. Please register again."
      });
    }

    // 🔐 Verify temporary token
    let decoded;
    try {
      decoded = jwt.verify(verifyToken, process.env.JWT_SECRET_KEY);
    } catch {
      return res.status(401).json({
        code: "INVALID_VERIFY_TOKEN",
        message: "Verification session expired. Please register again."
      });
    }

    if (decoded.purpose !== "EMAIL_VERIFY") {
      return res.status(403).json({
        code: "INVALID_PURPOSE",
        message: "Invalid verification request"
      });
    }

    // 🔍 Fetch user
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "User not found"
      });
    }

    if (user.isEmailVerified) {
      return res.status(409).json({
        code: "ALREADY_VERIFIED",
        message: "Email already verified"
      });
    }

    // ⏱ Cooldown check (optional but recommended)
    if (
      user.emailOtpExpires &&
      user.emailOtpExpires > Date.now() + 4 * 60 * 1000
    ) {
      return res.status(429).json({
        code: "OTP_ALREADY_SENT",
        message: "OTP already sent. Please wait before requesting again."
      });
    }

    // 🔁 Generate new OTP
    const otp = crypto.randomInt(100000, 999999);
    user.emailOtpHash = hashOtp(otp);
    user.emailOtpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    // 📧 Send email
    await sendEmail({
      to: user.email,
      subject: "Resend Email Verification Code",
      html: `
        <h2>Email Verification</h2>
        <p>Your new verification code is:</p>
        <h1>${otp}</h1>
        <p>This code expires in 5 minutes.</p>
      `
    });

    return res.status(200).json({
      code: "EMAIL_OTP_RESENT",
      message: "Verification code resent to your email"
    });

  } catch (error) {
    console.error("Resend OTP error:", error.message);
    return res.status(500).json({
      code: "RESEND_FAILED",
      message: "Failed to resend verification code"
    });
  }
};



exports.resendForgotPasswordOtp = async (req, res) => {
  try {
    const resetToken = req.cookies.reset_token;
    if (!resetToken) {
      return res.status(401).json({
        code: "RESET_SESSION_EXPIRED",
        message: "Password reset session expired. Please start again."
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET_KEY);
    } catch {
      return res.status(401).json({
        code: "INVALID_RESET_TOKEN",
        message: "Password reset session expired. Please start again."
      });
    }

    if (decoded.purpose !== "PASSWORD_RESET") {
      return res.status(403).json({
        code: "INVALID_PURPOSE",
        message: "Invalid password reset request"
      });
    }

    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "User not found"
      });
    }

    // ⏱ Cooldown
    if (
      user.passwordResetExpires &&
      user.passwordResetExpires > Date.now() + 6 * 60 * 1000
    ) {
      return res.status(429).json({
        code: "OTP_ALREADY_SENT",
        message: "OTP already sent. Please wait before requesting again."
      });
    }

    const otp = generateOtp();
    user.passwordResetCode = hashOtp(otp);
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Password Reset Code",
      html: `
        <h2>Password Reset</h2>
        <p>Your new reset code is:</p>
        <h1>${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      `
    });

    return res.status(200).json({
      code: "PASSWORD_RESET_OTP_RESENT",
      message: "Password reset code resent"
    });

  } catch (error) {
    console.error("Resend reset OTP error:", error);
    return res.status(500).json({
      code: "RESEND_FAILED",
      message: "Failed to resend reset code"
    });
  }
};

exports.verifyForgotOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const resetToken = req.cookies.reset_token;

    if (!resetToken) {
      return res.status(401).json({
        code: "RESET_SESSION_EXPIRED",
        message: "Password reset session expired. Please restart."
      });
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        code: "INVALID_OTP",
        message: "Invalid OTP format"
      });
    }

    // 🔐 Verify reset session
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET_KEY);
    } catch {
      return res.status(401).json({
        code: "INVALID_RESET_TOKEN",
        message: "Password reset session expired"
      });
    }

    if (decoded.purpose !== "PASSWORD_RESET") {
      return res.status(403).json({
        code: "INVALID_PURPOSE",
        message: "Invalid reset request"
      });
    }

    const user = await User.findById(decoded.sub)
      .select("+passwordResetCode +passwordResetExpires");

    if (!user || !user.passwordResetCode) {
      return res.status(404).json({
        code: "RESET_NOT_FOUND",
        message: "Password reset request not found"
      });
    }
    if (user.passwordResetExpires < Date.now()) {
      return res.status(410).json({
        code: "OTP_EXPIRED",
        message: "Reset code expired. Please request again."
      });
    }

    const hashedOtp = hashOtp(otp);

    if (hashedOtp !== user.passwordResetCode) {
      return res.status(401).json({
        code: "OTP_INVALID",
        message: "Invalid reset code"
      });
    }

    // 🔐 OTP verified — promote session to PASSWORD_RESET_VERIFIED
    const verifiedToken = jwt.sign(
      {
        sub: user._id,
        purpose: "PASSWORD_RESET_VERIFIED"
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "10m" }
    );

    res.cookie("reset_token", verifiedToken, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      // sameSite: "strict",
      secure: true,
      sameSite: "none",
      maxAge: 10 * 60 * 1000
    });

    // 🔐 Invalidate OTP so it cannot be reused
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({
      code: "RESET_VERIFIED",
      message: "OTP verified. You may now set a new password."
    });

  } catch (error) {
    console.error("Verify forgot OTP error:", error);
    return res.status(500).json({
      code: "VERIFY_FAILED",
      message: "Failed to verify reset code"
    });
  }
};