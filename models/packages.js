const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  per: { type: String, required: true },       // Monthly / Yearly
  feature: { type: Number, required: true },   // matches your packages array
  startDate: { type: Date, required: true },
  endingDate: { type: Date, required: true },

  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: "Users" 
  }
}, { timestamps: true });

module.exports = mongoose.model("Plan", planSchema);
