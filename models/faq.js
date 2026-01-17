const mongoose = require('mongoose')

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      index: true
    },
    answer: {
      type: String,
      required: true,
      index: true
    },
    priorityNumber: {
      type: Number,
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      enum: ["Sell", "Buy", "Plans", "Security"],
      index: true
    }
  },
  { timestamps: true }
);

// ✅ CATEGORY-WISE UNIQUE PRIORITY
faqSchema.index(
  { category: 1, priorityNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("Faq", faqSchema);
