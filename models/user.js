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
    userName: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      index: true,
      sparse: true,
      validate: {
        validator: async function (value) {
          if (!value) return true;

          const existing = await mongoose.models.User.findOne({
            userName: value,
            _id: { $ne: this._id }
          });

          return !existing;
        },
        message: "Username already taken"
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
    refreshTokens: [
      {
        token: { type: String, select: false },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
        userAgent: String,
        ip: String
      }
    ],
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

    lastFailedAttemptAt: {
      type: Date,
      select: false
    },

    // Optional: audit reason
    // 🔐 SECURITY
    failedAttempts: {
      type: Number,
      default: 0,
      select: false,
      index: true
    },

    accountLockedUntil: {
      type: Date,
      select: false,
      index: true
    },
    lockReason: {
      type: String,
      enum: ["OTP_FAILED", "LOGIN_FAILED", "PASSWORD_RESET_FAILED"],
      select: false
    },
  },

  { timestamps: true },
  
);
userSchema.index({
  role: 1,
  createdAt: -1
});

module.exports = mongoose.model("User", userSchema);
