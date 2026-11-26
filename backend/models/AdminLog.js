const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      enum: ["user", "nft", "collection", "payment", "system"],
      default: "system",
    },
    targetId: {
      type: String,
      default: "",
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminLog", adminLogSchema);
