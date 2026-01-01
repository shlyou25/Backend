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
    isActive:{
        type:Boolean,
        default:false,
    },
    
    plans: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Plan" }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
