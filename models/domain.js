const mongoose = require("mongoose");

const domainSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true
    },

    domainSearch: {
      type: String,
      index: true,
      select: false
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["Pass", "Fail", "Manual Review"],
      index: true
    },

    finalUrl: {
      type: String,
      default: null
    },

    isChatActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isMessageNotificationEnabled: {
      type: Boolean,
      default: false,
      index: true
    },
    isHidden: {
      type: Boolean,
      default: false,
      index: true
    },

    isPromoted: {
      type: Boolean,
      default: false,
      index: true
    },

    promotionPriority: {
      type: Number,
      sparse: true
    }
  },
  { timestamps: true }
);

domainSchema.index(
  { promotionPriority: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isPromoted: true,
      promotionPriority: { $exists: true }
    }
  }
);

module.exports =
  mongoose.models.Domain ||
  mongoose.model("Domain", domainSchema);
