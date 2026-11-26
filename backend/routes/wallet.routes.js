const express = require("express");
const { body, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

router.post(
  "/connect",
  protect,
  [
    body("address").trim().notEmpty().withMessage("Wallet address is required"),
    body("provider")
      .isIn(["MetaMask", "Rainbow", "WalletConnect", "Coinbase"])
      .withMessage("Unsupported wallet provider"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const { address, provider } = req.body;

      req.user.wallet = { address, provider, connectedAt: new Date() };
      await req.user.save();

      res.json({
        success: true,
        message: `${provider} wallet connected`,
        wallet: req.user.wallet,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/", protect, async (req, res) => {
  res.json({ success: true, wallet: req.user.wallet || null });
});

router.delete("/disconnect", protect, async (req, res, next) => {
  try {
    req.user.wallet = null;
    await req.user.save();
    res.json({ success: true, message: "Wallet disconnected" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
