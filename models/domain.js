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
    status: {
      type: String,
      enum: ["Pass", "Fail", "Manual Review"],
      index: true
    },
    finalUrl: {
      type: String,          // ✅ MUST EXIST
      default: null
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
    },
    isPromoted:{
      type:Boolean,
      default:false,
      index:true
    },
     promotionPriority: {
      type: Number,
      unique: true,        // 🚨 GLOBAL uniqueness
      sparse: true,        // allows multiple nulls
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Domain", domainSchema);
