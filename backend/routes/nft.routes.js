const express = require("express");
const { body, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const NFT = require("../models/NFT");

const router = express.Router();

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

router.get("/", async (req, res, next) => {
  try {
    const nfts = await NFT.find({ isActive: { $ne: false } }).sort({ createdAt: -1 });
    res.json({ success: true, nfts });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  protect,
  [
    body("name").trim().notEmpty().withMessage("NFT name is required"),
    body("category")
      .isIn(["Art", "Music", "Gaming", "Photography", "Collectibles"])
      .withMessage("Choose a valid category"),
    body("price").isFloat({ gt: 0 }).withMessage("Price must be greater than 0"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      if (req.user.role !== "admin" && (!req.user.wallet || !req.user.wallet.address)) {
        return res.status(400).json({
          success: false,
          message: "Connect a wallet before creating an NFT",
        });
      }

      const { name, category, price, image, description } = req.body;

      const nft = await NFT.create({
        name,
        category,
        price,
        description: description ? String(description).trim() : "",
        image: image && image.trim() ? image.trim() : `https://picsum.photos/seed/${Date.now()}/400/300`,
        creator: req.user.username ? `@${req.user.username}` : req.user.name,
        owner: req.user._id,
      });

      res.status(201).json({ success: true, message: "NFT created successfully", nft });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
