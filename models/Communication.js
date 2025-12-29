// models/Communication.js
const mongoose = require("mongoose");

const communicationSchema = new mongoose.Schema(
  {
    domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
      unique: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    proxyEmail: {
      type: String,
      required: true,
      unique: true
    },
    contactCount: {
      type: Number,
      default: 0
    },
    lastContactedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Communication", communicationSchema);
