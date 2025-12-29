const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },

    phoneNumber: {
      type: String,
      required: false,
      select: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true
    },

    isEmailVerified: {
      type: Boolean,
      default: false
    },

    mustChangePassword: {
      type: Boolean,
      default: false
    },

    // Used to invalidate tokens on logout
    tokenVersion: {
      type: Number,
      default: 0
    },

    // 🔐 Forgot password (email code)
    passwordResetCode: {
      type: String,
      select: false
    },

    passwordResetExpires: {
      type: Date
    },
    // Add these fields if not present
emailOtpHash: {
  type: String,
  select: false
},
emailOtpExpires: {
  type: Date
},


    // 🔐 Admin email OTP (2FA)
    adminOtpHash: {
      type: String,
      select: false
    },

    adminOtpExpires: {
      type: Date
    },
    

    plans: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Plan" }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
