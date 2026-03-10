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
  type: {
  type: String,
  enum: ["NEW", "UPGRADE"],
  default: "NEW"
},
domains: {
    type: String,
    required: true
  },

  sellerType: {
    type: String,
    enum: ["Broker", "Private Seller"],
    required: true
  },

  website: String,
  social: String,
  marketplace: String,
  portfolio: String,
  comments: String,
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("PlanRequest", planRequestSchema);
