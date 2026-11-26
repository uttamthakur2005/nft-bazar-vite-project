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

router.get("/me", protect, async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

router.patch(
  "/profile",
  protect,
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
    body("phone")
      .optional({ values: "falsy" })
      .trim()
      .isLength({ max: 20 }).withMessage("Phone number is too long"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const { name, username, phone } = req.body;

      if (username && username !== req.user.username) {
        const exists = await User.findOne({ username, _id: { $ne: req.user._id } });
        if (exists) {
          return res.status(409).json({ success: false, message: "Username already taken" });
        }
        req.user.username = username;
      }

      if (name !== undefined) req.user.name = name;
      if (phone !== undefined) req.user.phone = phone;

      await req.user.save();
      res.json({
        success: true,
        message: "Profile updated",
        user: req.user.toSafeObject(),
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
