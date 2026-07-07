const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    default: "Unknown",
  },
  plan: {
    type: String,
    enum: [
      "3days",
      "5days",
      "7days",
      "15days",
      "30days",
      "forever",
      "pending",
      "rejected",
    ],
    default: "pending",
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "active", "expired", "locked"],
    default: "pending",
  },
  expiresAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  approvedAt: {
    type: Date,
  },
  rejectedAt: {
    type: Date,
  },
  adminNote: {
    type: String,
    default: "",
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    default: "",
  },
});

DeviceSchema.methods.getExpiryDate = function () {
  const now = new Date();
  const days = {
    "3days": 3,
    "5days": 5,
    "7days": 7,
    "15days": 15,
    "30days": 30,
    forever: 36500,
  };
  const addDays = days[this.plan] || 7;
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + addDays);
  return expiry;
};

DeviceSchema.methods.isExpired = function () {
  if (this.plan === "forever") return false;
  if (this.isLocked) return true;
  if (!this.expiresAt) return true;
  const now = new Date();
  return now > this.expiresAt;
};

DeviceSchema.methods.isApproved = function () {
  return this.status === "approved" || this.status === "active";
};

module.exports = mongoose.model("Device", DeviceSchema);
