const mongoose = require('mongoose')

const faqSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            require: true,
            index: true
        },
        answer: {
            type: String,
            require: true,
            index: true
        },
        priorityNumber: {
            type: Number,
            require: true,
            index: true,
            unique: true,
        },
        category: {
            type: String,
            required: true,
            enum: ["Sell", "Buy", "Plans", "Security"],
            index: true
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model("Faq", faqSchema);