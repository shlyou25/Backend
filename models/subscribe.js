const mongoose = require("mongoose");

const subscribeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    emailNormalized: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    verificationToken: {
      type: String,
      default: null,
      index: true,
    },

    verificationExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

subscribeSchema.index(
  { emailNormalized: 1 },
  { unique: true, partialFilterExpression: { isVerified: true } }
);

subscribeSchema.index(
  { verificationExpires: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { isVerified: false } }
);

subscribeSchema.pre("save", function (next) {
  if (this.email) {
    this.emailNormalized = this.email.toLowerCase().trim();
  }
  next();
});

module.exports = mongoose.model("Subscriber", subscribeSchema);