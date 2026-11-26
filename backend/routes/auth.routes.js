const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many attempts, please try again later." },
});

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

const emailValidation = () =>
  body("email")
    .trim()
    .isEmail().withMessage("Enter a valid email")
    .custom((email) => {
      if (typeof email !== "string") return false;
      const domainName = email.split("@")[1]?.split(".")[0] || "";
      return /[A-Za-z]/.test(domainName);
    })
    .withMessage("Email domain must include letters");

router.post(
  "/register",
  authLimiter,
  [
    body("name")
      .trim()
      .notEmpty().withMessage("Name is required")
      .matches(/^[A-Za-z\s.'-]+$/).withMessage("Name can only contain letters and spaces, not numbers"),
    emailValidation(),
    body("username")
      .optional({ values: "falsy" })
      .trim()
      .customSanitizer((v) => v.replace(/^@+/, "").toLowerCase())
      .matches(/^[a-z0-9_]{3,30}$/).withMessage("Username must be 3-30 chars (letters, numbers, underscore)"),
    body("phone")
      .optional({ values: "falsy" })
      .trim()
      .isLength({ min: 7, max: 20 }).withMessage("Enter a valid phone number"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const { name, email, password, username, phone } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      if (username) {
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
          return res.status(409).json({ success: false, message: "Username already taken" });
        }
      }

      const user = await User.create({
        name,
        email,
        username: username || undefined,
        phone: phone || "",
        password,
        role: "user",
        lastLoginAt: new Date(),
      });
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: "Registration successful",
        token,
        user: user.toSafeObject(),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/login",
  authLimiter,
  [
    body("password").notEmpty().withMessage("Password is required"),
    body("email").custom((value, { req }) => {
      const identifier = (req.body.identifier || value || "").trim();
      if (!identifier) {
        throw new Error("Email or username is required");
      }
      return true;
    }),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const rawIdentifier = (req.body.identifier || req.body.email || "").trim().toLowerCase();
      const { password } = req.body;

      const query = rawIdentifier.includes("@") && !rawIdentifier.startsWith("@")
        ? { email: rawIdentifier }
        : { username: rawIdentifier.replace(/^@+/, "") };

      const user = await User.findOne(query).select("+password");
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      if (user.isBlocked) {
        return res.status(403).json({ success: false, message: "Your account has been blocked by the admin" });
      }

      user.lastLoginAt = new Date();
      await user.save();

      const token = generateToken(user);

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: user.toSafeObject(),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/admin/login",
  authLimiter,
  [
    emailValidation(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Not an admin account" });
      }

      if (user.isBlocked) {
        return res.status(403).json({ success: false, message: "This admin account is blocked" });
      }

      user.lastLoginAt = new Date();
      await user.save();

      const token = generateToken(user);

      res.json({
        success: true,
        message: "Admin login successful",
        token,
        user: user.toSafeObject(),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/logout", protect, async (req, res, next) => {
  try {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  ],
  runValidation,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select("+password");

      if (!user || !(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ success: false, message: "New password must be different from current password" });
      }

      user.password = newPassword;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      const token = generateToken(user);
      res.json({
        success: true,
        message: "Password updated successfully",
        token,
        user: user.toSafeObject(),
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
