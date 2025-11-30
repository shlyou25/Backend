const mongoose = require("mongoose");

const domainSchema = new mongoose.Schema({
  domain: { type: String, required: true },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Users",
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model("Domain", domainSchema);
