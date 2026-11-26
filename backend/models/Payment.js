const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nftId: { type: String, required: true },
    nftName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "ETH" },
    walletAddress: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    txHash: { type: String },
    method: {
      type: String,
      enum: ["mock", "razorpay"],
      default: "mock",
    },
    fiatAmount: { type: Number },
    fiatCurrency: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
