const mongoose = require("mongoose");

const domainSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    isChatActive: {
      type: Boolean,
      default: true,
      index: true
    },

    isHidden: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Domain", domainSchema);
