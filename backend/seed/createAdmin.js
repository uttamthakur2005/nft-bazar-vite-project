require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = (process.env.ADMIN_EMAIL || "admin@nftbazar.com").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const name = process.env.ADMIN_NAME || "Super Admin";

    const existing = await User.findOne({ email });
    if (existing) {
      existing.role = "admin";
      await existing.save();
      console.log(`Existing user ${email} promoted to admin.`);
    } else {
      await User.create({ name, email, password, role: "admin" });
      console.log(`Admin account created: ${email} / ${password}`);
      console.log("IMPORTANT: change this password after first login.");
    }
  } catch (err) {
    console.error("Seeding failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
