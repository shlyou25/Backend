// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    planTitle: {
      type: String,
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      default: "usd"
    },

    status: {
      type: String,
      enum: ["pending", "succeeded", "plan_created", "failed"],
      default: "pending",
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
