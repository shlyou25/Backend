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

    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CommunicationMessage ||
  mongoose.model("CommunicationMessage", communicationMessageSchema);
