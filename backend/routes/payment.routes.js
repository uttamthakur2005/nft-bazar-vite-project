const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const Payment = require("../models/Payment");
const razorpay = require("../utils/razorpay");
const { ETH_CONVERSION_RATE } = require("../config/currency");

const router = express.Router();

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

router.post(
  "/checkout",
  protect,
  [
    body("nftId").notEmpty().withMessage("nftId is required"),
    body("nftName").notEmpty().withMessage("nftName is required"),
    body("amount").isFloat({ gt: 0 }).withMessage("amount must be greater than 0"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      if (!req.user.wallet || !req.user.wallet.address) {
        return res.status(400).json({ success: false, message: "Connect a wallet before making a purchase" });
      }
      const { nftId, nftName, amount, currency } = req.body;
      const payment = await Payment.create({
        user: req.user._id,
        nftId,
        nftName,
        amount,
        currency: currency || "ETH",
        walletAddress: req.user.wallet.address,
        status: "completed",
        method: "mock",
        txHash: "0x" + crypto.randomBytes(32).toString("hex"),
      });
      res.status(201).json({ success: true, message: "Demo checkout successful", payment });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/razorpay/create-order",
  protect,
  [
    body("nftId").notEmpty().withMessage("nftId is required"),
    body("nftName").notEmpty().withMessage("nftName is required"),
    body("amount").isFloat({ gt: 0 }).withMessage("amount must be greater than 0"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      if (!req.user.wallet || !req.user.wallet.address) {
        return res.status(400).json({ success: false, message: "Connect a wallet before making a purchase" });
      }
      const { nftId, nftName, amount } = req.body;
      const fiatAmount = Number((Number(amount) * ETH_CONVERSION_RATE).toFixed(2));
      const amountPaise = Math.round(fiatAmount * 100);
      if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
        return res.status(400).json({ success: false, message: "Payment amount must be at least ₹1.00" });
      }
      const order = await razorpay.createOrder(amountPaise, `nft-${nftId}-${Date.now()}`);
      await Payment.create({
        user: req.user._id,
        nftId: String(nftId),
        nftName,
        amount: Number(amount),
        currency: "ETH",
        walletAddress: req.user.wallet.address,
        status: "pending",
        method: "razorpay",
        fiatAmount,
        fiatCurrency: "INR",
        razorpayOrderId: order.id,
      });
      res.status(201).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        nft: { id: String(nftId), name: nftName, ethAmount: Number(amount), fiatAmount },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/razorpay/verify-payment",
  protect,
  [
    body("razorpay_order_id").notEmpty().withMessage("Razorpay order ID is required"),
    body("razorpay_payment_id").notEmpty().withMessage("Razorpay payment ID is required"),
    body("razorpay_signature").notEmpty().withMessage("Razorpay signature is required"),
    body("nftId").notEmpty().withMessage("nftId is required"),
    body("nftName").notEmpty().withMessage("nftName is required"),
    body("amount").isFloat({ gt: 0 }).withMessage("amount must be greater than 0"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, nftId, nftName, amount } = req.body;
      if (!req.user.wallet || !req.user.wallet.address) {
        return res.status(400).json({ success: false, message: "Connect a wallet before making a purchase" });
      }
      if (!razorpay.verifyPaymentSignature(orderId, paymentId, signature)) {
        return res.status(400).json({ success: false, message: "Payment signature verification failed" });
      }

      const existing = await Payment.findOne({ razorpayPaymentId: paymentId, user: req.user._id });
      if (existing) return res.json({ success: true, message: "Payment already verified", payment: existing });

      const payment = await Payment.findOne({ razorpayOrderId: orderId, user: req.user._id, method: "razorpay" });
      if (!payment) {
        return res.status(404).json({ success: false, message: "No matching checkout order was found for this account" });
      }
      if (payment.status === "completed") {
        return res.status(409).json({ success: false, message: "This order has already been completed" });
      }
      payment.razorpayPaymentId = paymentId;
      payment.status = "completed";
      payment.txHash = paymentId;
      await payment.save();
      res.status(201).json({ success: true, message: "Payment verified successfully", payment });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/history", protect, async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
