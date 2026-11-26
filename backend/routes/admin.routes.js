const express = require("express");
const { body, validationResult } = require("express-validator");
const { protect, adminOnly } = require("../middleware/auth");
const User = require("../models/User");
const Payment = require("../models/Payment");
const NFT = require("../models/NFT");
const Collection = require("../models/Collection");
const AdminLog = require("../models/AdminLog");
const { ETH_CONVERSION_RATE } = require("../config/currency");

const router = express.Router();

router.use(protect, adminOnly);

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

const recordLog = async (adminId, action, targetType, targetId, summary) => {
  try {
    await AdminLog.create({
      admin: adminId,
      action,
      targetType,
      targetId: String(targetId || ""),
      summary,
    });
  } catch (_) {}
};

// Aggregated dashboard KPIs and analytics
router.get("/stats", async (req, res, next) => {
  try {
    const [
      totalUsers,
      blockedUsers,
      dbNftsTotal,
      activeDbNfts,
      collectionsCount,
      payments,
      nftsByCategory,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBlocked: true }),
      NFT.countDocuments(),
      NFT.countDocuments({ isActive: { $ne: false } }),
      Collection.countDocuments(),
      Payment.find().sort({ createdAt: -1 }),
      NFT.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 }, totalValue: { $sum: "$price" } } },
      ]),
    ]);

    const completedPayments = payments.filter((p) => p.status === "completed");
    const pendingSales = payments.filter((p) => p.status === "pending").length;
    const failedSales = payments.filter((p) => p.status === "failed").length;

    const totalRevenueEth = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalRevenueInr = completedPayments.reduce((sum, p) => {
      if (p.fiatAmount != null) return sum + Number(p.fiatAmount);
      return sum + Number(p.amount || 0) * ETH_CONVERSION_RATE;
    }, 0);

    const salesByMethod = completedPayments.reduce(
      (acc, p) => {
        const key = p.method === "razorpay" ? "razorpay" : "mock";
        acc[key] += 1;
        return acc;
      },
      { razorpay: 0, mock: 0 }
    );

    res.json({
      success: true,
      stats: {
        totalUsers,
        blockedUsers,
        activeUsers: totalUsers - blockedUsers,
        dbNftsTotal,
        activeDbNfts,
        collectionsCount,
        totalSales: completedPayments.length,
        pendingSales,
        failedSales,
        totalPayments: payments.length,
        totalRevenueEth: Number(totalRevenueEth.toFixed(4)),
        totalRevenueInr: Number(totalRevenueInr.toFixed(2)),
        salesByMethod,
        nftsByCategory,
      },
    });
  } catch (err) {
    next(err);
  }
});

// List users with live owned & created NFT counts and total spent
router.get("/users", async (req, res, next) => {
  try {
    const [users, purchaseAgg, createdAgg] = await Promise.all([
      User.find().sort({ createdAt: -1 }),
      Payment.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: "$user", ownedCount: { $sum: 1 }, totalSpent: { $sum: "$amount" } } },
      ]),
      NFT.aggregate([
        { $group: { _id: "$owner", createdCount: { $sum: 1 } } },
      ]),
    ]);

    const purchaseMap = new Map(purchaseAgg.map((item) => [String(item._id), item]));
    const createdMap = new Map(createdAgg.map((item) => [String(item._id), item]));

    const enriched = users.map((u) => {
      const safe = u.toSafeObject();
      const pStats = purchaseMap.get(String(u._id));
      const cStats = createdMap.get(String(u._id));
      return {
        ...safe,
        ownedNftsCount: pStats?.ownedCount || 0,
        createdNftsCount: cStats?.createdCount || 0,
        totalSpent: Number((pStats?.totalSpent || 0).toFixed(4)),
      };
    });

    res.json({ success: true, count: enriched.length, users: enriched });
  } catch (err) {
    next(err);
  }
});

// Edit user profile, wallet balance, role, or block state
router.patch(
  "/users/:id",
  [
    body("name")
      .optional()
      .trim()
      .notEmpty().withMessage("Name cannot be empty")
      .matches(/^[A-Za-z\s.'-]+$/).withMessage("Name can only contain letters and spaces"),
    body("username")
      .optional({ values: "falsy" })
      .trim()
      .customSanitizer((v) => v.replace(/^@+/, "").toLowerCase())
      .matches(/^[a-z0-9_]{3,30}$/).withMessage("Username must be 3-30 chars (letters, numbers, underscore)"),
    body("email").optional().trim().isEmail().withMessage("Enter a valid email"),
    body("phone").optional().trim().isLength({ max: 25 }).withMessage("Phone is too long"),
    body("walletBalance").optional().isFloat({ min: 0 }).withMessage("Wallet balance must be >= 0"),
    body("role").optional().isIn(["user", "admin"]).withMessage("Invalid role"),
    body("isBlocked").optional().isBoolean().withMessage("Invalid block flag"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const target = await User.findById(req.params.id);
      if (!target) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const isSelf = String(target._id) === String(req.user._id);
      const { name, username, email, phone, walletBalance, role, isBlocked } = req.body;

      if (isSelf && role === "user") {
        return res.status(400).json({ success: false, message: "You cannot demote your own admin role" });
      }
      if (isSelf && isBlocked === true) {
        return res.status(400).json({ success: false, message: "You cannot block your own account" });
      }
      if (target.role === "admin" && isBlocked === true) {
        return res.status(400).json({ success: false, message: "Admin accounts cannot be blocked" });
      }

      if (email && email.toLowerCase() !== target.email) {
        const dupEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: target._id } });
        if (dupEmail) {
          return res.status(409).json({ success: false, message: "Email already in use" });
        }
        target.email = email.toLowerCase();
      }

      if (username !== undefined && username !== target.username) {
        if (username) {
          const dupUser = await User.findOne({ username, _id: { $ne: target._id } });
          if (dupUser) {
            return res.status(409).json({ success: false, message: "Username already taken" });
          }
          target.username = username;
        }
      }

      if (name !== undefined) target.name = name;
      if (phone !== undefined) target.phone = phone;
      if (walletBalance !== undefined) target.walletBalance = Number(walletBalance);
      if (role !== undefined) target.role = role;
      if (isBlocked !== undefined) {
        if (isBlocked && !target.isBlocked) {
          target.tokenVersion = (target.tokenVersion || 0) + 1;
        }
        target.isBlocked = isBlocked;
      }

      await target.save();
      await recordLog(req.user._id, "USER_UPDATED", "user", target._id, `Updated user ${target.name} (${target.email})`);

      res.json({ success: true, message: "User updated successfully", user: target.toSafeObject() });
    } catch (err) {
      next(err);
    }
  }
);

router.patch("/users/:id/block", async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (target.role === "admin") {
      return res.status(400).json({ success: false, message: "Admin accounts cannot be blocked" });
    }
    if (String(target._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "You cannot block your own account" });
    }

    target.isBlocked = true;
    target.tokenVersion = (target.tokenVersion || 0) + 1;
    await target.save();

    await recordLog(req.user._id, "USER_BLOCKED", "user", target._id, `Blocked user ${target.name} (${target.email})`);
    res.json({ success: true, message: "User blocked", user: target.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id/unblock", async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    target.isBlocked = false;
    await target.save();

    await recordLog(req.user._id, "USER_UNBLOCKED", "user", target._id, `Unblocked user ${target.name} (${target.email})`);
    res.json({ success: true, message: "User unblocked", user: target.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (target.role === "admin") {
      return res.status(400).json({ success: false, message: "Admin accounts cannot be deleted" });
    }
    if (String(target._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    await Payment.deleteMany({ user: target._id });
    await target.deleteOne();

    await recordLog(req.user._id, "USER_DELETED", "user", target._id, `Deleted user ${target.name} (${target.email})`);
    res.json({ success: true, message: "User permanently deleted" });
  } catch (err) {
    next(err);
  }
});

// Sales & payments
router.get("/payments", async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate("user", "name email username")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/payments/:id/status",
  [body("status").isIn(["pending", "completed", "failed"]).withMessage("Invalid payment status")],
  runValidation,
  async (req, res, next) => {
    try {
      const payment = await Payment.findById(req.params.id).populate("user", "name email username");
      if (!payment) {
        return res.status(404).json({ success: false, message: "Payment not found" });
      }
      payment.status = req.body.status;
      await payment.save();
      await recordLog(
        req.user._id,
        "PAYMENT_UPDATED",
        "payment",
        payment._id,
        `Set payment for "${payment.nftName}" to ${payment.status}`
      );
      res.json({ success: true, message: "Payment status updated", payment });
    } catch (err) {
      next(err);
    }
  }
);

// Admin NFT management (List new NFT, edit, toggle active, delete)
router.get("/nfts", async (req, res, next) => {
  try {
    const nfts = await NFT.find()
      .populate("owner", "name email username")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: nfts.length, nfts });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/nfts",
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
      const { name, category, price, image, creator, description, featured } = req.body;
      const nft = await NFT.create({
        name,
        category,
        price: Number(price),
        image: image && image.trim() ? image.trim() : `https://picsum.photos/seed/${Date.now()}/400/300`,
        description: description ? String(description).trim() : "",
        creator: creator && creator.trim() ? creator.trim() : (req.user.username ? `@${req.user.username}` : req.user.name),
        owner: req.user._id,
        isActive: true,
        featured: Boolean(featured),
      });
      await recordLog(req.user._id, "NFT_LISTED", "nft", nft._id, `Listed new NFT "${nft.name}" (${nft.price} ETH)`);
      res.status(201).json({ success: true, message: "NFT listed on marketplace", nft });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/nfts/:id",
  [
    body("name").optional().trim().notEmpty().withMessage("NFT name cannot be empty"),
    body("category")
      .optional()
      .isIn(["Art", "Music", "Gaming", "Photography", "Collectibles"])
      .withMessage("Choose a valid category"),
    body("price").optional().isFloat({ gt: 0 }).withMessage("Price must be greater than 0"),
    body("isActive").optional().isBoolean(),
    body("featured").optional().isBoolean(),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const nft = await NFT.findById(req.params.id).populate("owner", "name email username");
      if (!nft) {
        return res.status(404).json({ success: false, message: "NFT not found" });
      }
      const { name, category, price, image, creator, description, isActive, featured } = req.body;
      if (name !== undefined) nft.name = name;
      if (category !== undefined) nft.category = category;
      if (price !== undefined) nft.price = Number(price);
      if (image !== undefined && image.trim()) nft.image = image.trim();
      if (creator !== undefined && creator.trim()) nft.creator = creator.trim();
      if (description !== undefined) nft.description = description;
      if (isActive !== undefined) nft.isActive = isActive;
      if (featured !== undefined) nft.featured = featured;

      await nft.save();
      await recordLog(req.user._id, "NFT_UPDATED", "nft", nft._id, `Updated NFT "${nft.name}"`);
      res.json({ success: true, message: "NFT updated", nft });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/nfts/:id", async (req, res, next) => {
  try {
    const nft = await NFT.findByIdAndDelete(req.params.id);
    if (!nft) {
      return res.status(404).json({ success: false, message: "NFT not found" });
    }
    await recordLog(req.user._id, "NFT_DELETED", "nft", nft._id, `Deleted NFT "${nft.name}"`);
    res.json({ success: true, message: "NFT removed from marketplace" });
  } catch (err) {
    next(err);
  }
});

// Audit logs
router.get("/logs", async (req, res, next) => {
  try {
    const logs = await AdminLog.find()
      .populate("admin", "name email username")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
