const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Device = require("../models/Device");
const User = require("../models/User");
const DownloadLog = require("../models/DownloadLog");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const osType = req.body.osType || "windows";
    const dir = path.join(__dirname, "../../downloads", osType);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 500 },
});

router.get("/devices", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const devices = await Device.find().sort({ createdAt: -1 });
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put(
  "/devices/:deviceId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { plan, isLocked, notes, status } = req.body;

      const device = await Device.findOne({ deviceId: deviceId });

      if (!device) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }

      if (plan) {
        const validPlans = [
          "3days",
          "5days",
          "7days",
          "15days",
          "30days",
          "forever",
        ];
        if (validPlans.includes(plan)) {
          device.plan = plan;
          device.expiresAt = device.getExpiryDate();
          if (!device.isLocked) {
            device.status = "active";
            device.isActive = true;
          }
        } else {
          return res.status(400).json({
            success: false,
            message:
              "Plan không hợp lệ. Chọn: 3days, 5days, 7days, 15days, 30days, forever",
          });
        }
      }

      if (status) {
        const validStatus = [
          "pending",
          "approved",
          "active",
          "locked",
          "rejected",
        ];
        if (validStatus.includes(status)) {
          device.status = status;
          if (status === "locked") {
            device.isLocked = true;
            device.isActive = false;
          } else if (status === "active" || status === "approved") {
            device.isLocked = false;
            device.isActive = true;
          }
        }
      }
      if (isLocked !== undefined && isLocked !== null) {
        device.isLocked = isLocked;

        if (isLocked === true) {
          device.isActive = false;
          device.status = "locked";
        } else {
          device.isActive = true;
          if (
            device.status === "locked" &&
            device.plan !== "pending" &&
            device.plan !== "rejected"
          ) {
            device.status = "active";
          }
        }
      }

      if (notes !== undefined) {
        device.notes = notes;
      }

      device.lastUsed = new Date();
      await device.save();

      res.json({
        success: true,
        data: device,
        message: "Device updated successfully",
      });
    } catch (error) {
      console.error("Update device error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.delete(
  "/devices/:deviceId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      const device = await Device.findOneAndDelete({ deviceId: deviceId });
      if (!device) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }
      res.json({ success: true, message: "Device deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-__v").sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/logs", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const logs = await DownloadLog.find().sort({ downloadDate: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [totalDevices, activeDevices, totalUsers, totalDownloads] =
      await Promise.all([
        Device.countDocuments(),
        Device.countDocuments({ isActive: true, isLocked: false }),
        User.countDocuments(),
        DownloadLog.countDocuments(),
      ]);

    const deviceByPlan = await Device.aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalDevices,
        activeDevices,
        totalUsers,
        totalDownloads,
        deviceByPlan,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  "/upload-file",
  authMiddleware,
  adminMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const { osType, version } = req.body;
      const file = req.file;

      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      if (!osType || !["windows", "mac", "linux"].includes(osType)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid OS type" });
      }

      res.json({
        success: true,
        message: "File uploaded successfully",
        data: {
          fileName: file.filename,
          osType: osType,
          version: version || "1.0.0",
          size: (file.size / 1024 / 1024).toFixed(2) + " MB",
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      res
        .status(500)
        .json({ success: false, message: "Upload failed: " + error.message });
    }
  },
);

module.exports = router;
