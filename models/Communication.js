const mongoose = require("mongoose");

const communicationSchema = new mongoose.Schema(
  {
    domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
      index: true
    },

    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

communicationSchema.index(
  { domainId: 1, buyerId: 1, sellerId: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.Communication ||
  mongoose.model("Communication", communicationSchema);
