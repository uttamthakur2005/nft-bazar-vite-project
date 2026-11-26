const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const walletSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true },
    provider: {
      type: String,
      enum: ["MetaMask", "Rainbow", "WalletConnect", "Coinbase"],
    },
    connectedAt: { type: Date },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 80,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      maxlength: 40,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/, "Enter a valid email"],
      validate: {
        validator(value) {
          if (typeof value !== "string") return false;
          const domainName = value.split("@")[1]?.split(".")[0] || "";
          return /[A-Za-z]/.test(domainName);
        },
        message: "Email domain must include letters",
      },
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 25,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    wallet: {
      type: walletSchema,
      default: null,
    },
    walletBalance: {
      type: Number,
      default: 100,
      min: 0,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.username && this.email) {
    const base = this.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 20) || "user";
    const suffix = String(this._id || "").slice(-4);
    this.username = `${base}_${suffix}`;
  }
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    username: this.username || "",
    email: this.email,
    phone: this.phone || "",
    role: this.role,
    isBlocked: this.isBlocked || false,
    wallet: this.wallet || null,
    walletBalance: typeof this.walletBalance === "number" ? this.walletBalance : 100,
    lastLoginAt: this.lastLoginAt || null,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
