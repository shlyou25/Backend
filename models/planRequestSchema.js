const mongoose = require("mongoose");

const planRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  planTitle: String,
  price: Number,
  per: String,
  featureLimit: Number,
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("PlanRequest", planRequestSchema);
