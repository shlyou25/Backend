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
    secondaryEmail: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true, 
      index: true,
      validate: {
        validator: function (value) {
          return !value || value !== this.email;
        },
        message:
          "Secondary email must be different from the primary email. The primary email is used for sales interactions when chat is enabled."
      }
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
    tokenVersion: {
      type: Number,
      default: 0
    },
    passwordResetCode: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date
    },
    emailOtpHash: {
      type: String,
      select: false
    },
    emailOtpExpires: {
      type: Date
    },
    adminOtpHash: {
      type: String,
      select: false
    },
    adminOtpExpires: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    // User schema (ADD THIS)
    featureBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    plans: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Plan" }
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // 🔐 SECURITY / ABUSE PROTECTION
    failedAttempts: {
      type: Number,
      default: 0,
      select: false
    },

    accountLockedUntil: {
      type: Date,
      select: false
    },

    lastFailedAttemptAt: {
      type: Date,
      select: false
    },

    // Optional: audit reason
    lockReason: {
      type: String,
      enum: ["OTP_FAILED", "LOGIN_FAILED", "PASSWORD_RESET_FAILED"],
      select: false
    },

    // --- rest ---

  },
  
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
