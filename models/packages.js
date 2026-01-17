const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    per: {
      type: String,
      enum: ["Month", "Year"],
      required: true
    },

    feature: {
      type: Number,
      required: true,
      min: 0
    },

    startDate: {
      type: Date,
      required: true
    },

    endingDate: {
      type: Date,
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",       
      required: true,
      index: true
    },
    durationInMonths: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }

  },
  { timestamps: true }
);

planSchema.index({ endingDate: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Plan", planSchema);
