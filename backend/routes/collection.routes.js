const express = require("express");
const { body, validationResult } = require("express-validator");
const { protect, adminOnly } = require("../middleware/auth");
const Collection = require("../models/Collection");
const AdminLog = require("../models/AdminLog");

const router = express.Router();

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

const recordLog = async (adminId, action, targetId, summary) => {
  try {
    await AdminLog.create({
      admin: adminId,
      action,
      targetType: "collection",
      targetId: String(targetId || ""),
      summary,
    });
  } catch (_) {}
};

router.get("/", async (req, res, next) => {
  try {
    const collections = await Collection.find().sort({ createdAt: -1 });
    res.json({ success: true, collections });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  protect,
  adminOnly,
  [
    body("name").trim().notEmpty().withMessage("Collection name is required"),
    body("coverImage").trim().notEmpty().withMessage("Cover image URL is required"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const { name, description, coverImage } = req.body;
      const collection = await Collection.create({
        name,
        description: description || "",
        coverImage,
        createdBy: req.user._id,
      });
      await recordLog(req.user._id, "COLLECTION_CREATED", collection._id, `Created collection "${collection.name}"`);
      res.status(201).json({ success: true, message: "Collection created", collection });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id",
  protect,
  adminOnly,
  [
    body("name").optional().trim().notEmpty().withMessage("Collection name cannot be empty"),
    body("coverImage").optional().trim().notEmpty().withMessage("Cover image URL cannot be empty"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const collection = await Collection.findById(req.params.id);
      if (!collection) {
        return res.status(404).json({ success: false, message: "Collection not found" });
      }
      if (req.body.name !== undefined) collection.name = req.body.name;
      if (req.body.description !== undefined) collection.description = req.body.description;
      if (req.body.coverImage !== undefined) collection.coverImage = req.body.coverImage;
      await collection.save();
      await recordLog(req.user._id, "COLLECTION_UPDATED", collection._id, `Updated collection "${collection.name}"`);
      res.json({ success: true, message: "Collection updated", collection });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }
    await recordLog(req.user._id, "COLLECTION_DELETED", collection._id, `Deleted collection "${collection.name}"`);
    res.json({ success: true, message: "Collection deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
