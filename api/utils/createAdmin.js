const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../../models/user");

exports.createAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists) return;

    if (!process.env.ADMIN_EMAIL) {
      throw new Error("ADMIN_EMAIL missing in env");
    }
    const password = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      email: process.env.ADMIN_EMAIL.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      isEmailVerified: true,
      mustChangePassword: true
    });

    console.log("🔥 Admin created");
    console.log("👉 ADMIN PASSWORD (SAVE NOW):", password);
  } catch (err) {
    console.error("Admin creation error:", err);
  }
};
