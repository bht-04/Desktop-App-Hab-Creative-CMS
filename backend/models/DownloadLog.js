const mongoose = require("mongoose");

const DownloadLogSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  osType: {
    type: String,
    enum: ["windows", "mac", "linux"],
    required: true,
  },
  arch: {
    type: String,
    enum: ["x64", "x32", "arm64", "armv7", "universal", "x86_64", "amd64"],
    default: "x64",
  },
  version: {
    type: String,
    default: "1.0.0",
  },
  downloadDate: {
    type: Date,
    default: Date.now,
  },
  ip: {
    type: String,
  },
});

module.exports = mongoose.model("DownloadLog", DownloadLogSchema);
