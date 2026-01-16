const mongoose = require("mongoose");

const communicationSchema = new mongoose.Schema(
  {
    domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
      index: true
    },

    buyerEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },

    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },

    buyerProxy: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    sellerProxy: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

/**
 * Auto-delete expired proxy conversations
 */
communicationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("Communication", communicationSchema);
