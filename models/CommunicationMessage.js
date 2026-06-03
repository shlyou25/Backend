const mongoose = require("mongoose");

const communicationMessageSchema = new mongoose.Schema(
  {
    communicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Communication",
      required: true,
      index: true
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    senderRole: {
      type: String,
      enum: ["buyer", "seller"],
      required: true,
      index: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    seen: {
      type: Boolean,
      default: false,
      index: true
    },

    seenAt: Date,
  },
  { timestamps: true }
);
communicationMessageSchema.index({
  communicationId: 1,
  createdAt: 1,
});

communicationMessageSchema.index({
  communicationId: 1,
  seen: 1,
});
module.exports =
  mongoose.models.CommunicationMessage ||
  mongoose.model("CommunicationMessage", communicationMessageSchema);
