const mongoose = require("mongoose");

const subscribeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // ✅ NEW — verification status
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ✅ NEW — email verification token
    verificationToken: {
      type: String,
      default: null,
      index: true,
    },

    // ✅ NEW — token expiry
    verificationExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate verified emails
subscribeSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isVerified: true } }
);

module.exports = mongoose.model("Subscriber", subscribeSchema);