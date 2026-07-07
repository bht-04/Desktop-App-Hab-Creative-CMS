const mongoose = require("mongoose");

const ArchitectureSchema = new mongoose.Schema({
  osType: {
    type: String,
    enum: ["windows", "mac", "linux"],
    required: true,
  },
  arch: {
    type: String,
    enum: ["x64", "x32", "arm64", "armv7", "universal", "x86_64", "amd64"],
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  fileType: {
    type: String,
    enum: [
      "exe",
      "msi",
      "dmg",
      "app",
      "pkg",
      "AppImage",
      "deb",
      "rpm",
      "zip",
      "tar.gz",
      "7z",
    ],
    default: "zip",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    default: "",
  },
  uploadedBy: {
    type: String,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  downloads: {
    type: Number,
    default: 0,
  },
  version: {
    type: String,
    default: "1.0.0",
  },
  changelog: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("Architecture", ArchitectureSchema);
