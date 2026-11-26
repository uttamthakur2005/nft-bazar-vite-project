const mongoose = require("mongoose");

const nftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "NFT name is required"],
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      required: true,
      enum: ["Art", "Music", "Gaming", "Photography", "Collectibles"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    creator: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NFT", nftSchema);
