const express = require("express");
const router = express.Router();
const Device = require("../models/Device");
const { authMiddleware } = require("../middleware/auth");
const checkDeviceExpiry = require("../middleware/deviceExpiry");

router.use(checkDeviceExpiry);

router.post("/register", authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId || deviceId.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Device ID hợp lệ (tối thiểu 10 ký tự)",
      });
    }

    let existingDevice = await Device.findOne({ deviceId });

    if (existingDevice) {
      if (existingDevice.status === "pending") {
        return res.status(400).json({
          success: false,
          message: "Device đang chờ duyệt. Vui lòng đợi Admin xử lý.",
        });
      }
      if (
        existingDevice.status === "approved" ||
        existingDevice.status === "active"
      ) {
        return res.status(400).json({
          success: false,
          message: "Device đã được kích hoạt. Bạn có thể sử dụng!",
        });
      }
      if (existingDevice.status === "rejected") {
        return res.status(400).json({
          success: false,
          message:
            "Device đã bị từ chối. Vui lòng liên hệ Admin để biết thêm chi tiết.",
        });
      }
      if (existingDevice.status === "locked") {
        return res.status(400).json({
          success: false,
          message: "Device đã bị khóa. Vui lòng liên hệ Admin.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Device đã tồn tại với trạng thái: " + existingDevice.status,
      });
    }

    const existingUserDevice = await Device.findOne({
      userEmail: req.user.email,
      status: { $in: ["pending", "approved", "active", "locked"] },
    });

    if (existingUserDevice) {
      const statusText = {
        pending: "đang chờ duyệt",
        approved: "đã được duyệt",
        active: "đang hoạt động",
        locked: "đã bị khóa",
      };
      return res.status(400).json({
        success: false,
        message: `Bạn đã có device ${statusText[existingUserDevice.status] || ""}. Mỗi user chỉ được đăng ký 1 device.`,
      });
    }

    const newDevice = new Device({
      deviceId,
      userEmail: req.user.email,
      userName: req.user.name || req.user.email.split("@")[0],
      plan: "pending",
      status: "pending",
      isActive: false,
      isLocked: false,
    });

    await newDevice.save();

    res.json({
      success: true,
      message: "Đăng ký thành công! Vui lòng đợi Admin duyệt.",
      data: {
        deviceId: newDevice.deviceId,
        status: newDevice.status,
        registeredAt: newDevice.registeredAt,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res
        .status(400)
        .json({ success: false, message: "Device ID required" });
    }

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device không tồn tại.",
      });
    }

    if (device.isLocked || device.status === "locked") {
      return res.status(403).json({
        success: false,
        message: "Device đã bị khóa. Vui lòng liên hệ Admin.",
      });
    }

    if (device.isExpired()) {
      return res.status(403).json({
        success: false,
        message: "License đã hết hạn. Vui lòng gia hạn.",
      });
    }

    device.lastUsed = new Date();
    await device.save();

    res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        status: device.status,
        plan: device.plan,
        expiresAt: device.expiresAt,
        daysLeft: device.expiresAt
          ? Math.ceil((device.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
          : 0,
      },
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/approve/:deviceId", authMiddleware, async (req, res) => {
  try {
    if (
      req.user.role !== "admin" &&
      req.user.email !== "buihaitrong.dev@gmail.com"
    ) {
      return res.status(403).json({
        success: false,
        message: "Chỉ Admin mới có quyền này!",
      });
    }

    const { deviceId } = req.params;
    const { plan, adminNote } = req.body;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });
    }

    if (device.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Device đã được xử lý. Trạng thái hiện tại: " + device.status,
      });
    }

    device.status = "approved";
    device.plan = plan || "30days";
    device.isActive = true;
    device.isLocked = false;
    device.approvedAt = new Date();
    device.expiresAt = device.getExpiryDate();
    if (adminNote) {
      device.adminNote = adminNote;
    }

    await device.save();

    res.json({
      success: true,
      message: "Device đã được duyệt thành công!",
      data: {
        deviceId: device.deviceId,
        status: device.status,
        plan: device.plan,
        expiresAt: device.expiresAt,
      },
    });
  } catch (error) {
    console.error("Approve error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/reject/:deviceId", authMiddleware, async (req, res) => {
  try {
    if (
      req.user.role !== "admin" &&
      req.user.email !== "buihaitrong.dev@gmail.com"
    ) {
      return res.status(403).json({
        success: false,
        message: "Chỉ Admin mới có quyền này!",
      });
    }

    const { deviceId } = req.params;
    const { adminNote } = req.body;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });
    }

    if (device.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Device đã được xử lý. Trạng thái hiện tại: " + device.status,
      });
    }

    device.status = "rejected";
    device.isActive = false;
    device.isLocked = false;
    device.rejectedAt = new Date();
    if (adminNote) {
      device.adminNote = adminNote;
    }

    await device.save();

    res.json({
      success: true,
      message: "Device đã bị từ chối.",
      data: {
        deviceId: device.deviceId,
        status: device.status,
        adminNote: device.adminNote,
      },
    });
  } catch (error) {
    console.error("Reject error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/pending", authMiddleware, async (req, res) => {
  try {
    if (
      req.user.role !== "admin" &&
      req.user.email !== "buihaitrong.dev@gmail.com"
    ) {
      return res.status(403).json({
        success: false,
        message: "Chỉ Admin mới có quyền này!",
      });
    }

    const pendingDevices = await Device.find({
      status: "pending",
    }).sort({ registeredAt: -1 });

    res.json({
      success: true,
      data: pendingDevices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/check", async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "Device ID required",
      });
    }

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    if (device.isLocked || device.status === "locked") {
      return res.status(403).json({
        success: false,
        message: "Device is locked",
        isLocked: true,
      });
    }

    if (device.isExpired()) {
      return res.status(403).json({
        success: false,
        message: "License expired",
        isExpired: true,
      });
    }

    device.lastUsed = new Date();
    await device.save();

    res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        plan: device.plan,
        expiresAt: device.expiresAt,
        daysLeft: Math.ceil(
          (device.expiresAt - new Date()) / (1000 * 60 * 60 * 24),
        ),
      },
    });
  } catch (error) {
    console.error("Check error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/user/:email", authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;

    if (email !== req.user.email) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const device = await Device.findOne({
      userEmail: email,
      status: { $ne: "rejected" },
    });

    if (!device) {
      return res.json({ success: true, data: null });
    }

    let daysLeft = 0;
    if (device.expiresAt) {
      const diff = new Date(device.expiresAt) - new Date();
      daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        status: device.status,
        plan: device.plan,
        expiresAt: device.expiresAt,
        daysLeft: daysLeft,
        registeredAt: device.registeredAt,
        approvedAt: device.approvedAt,
        adminNote: device.adminNote,
        isLocked: device.isLocked || false,
        isActive: device.isActive,
      },
    });
  } catch (error) {
    console.error("Get user device error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/all", authMiddleware, async (req, res) => {
  try {
    if (
      req.user.role !== "admin" &&
      req.user.email !== "buihaitrong.dev@gmail.com"
    ) {
      return res.status(403).json({
        success: false,
        message: "Chỉ Admin mới có quyền này!",
      });
    }

    const devices = await Device.find().sort({ createdAt: -1 });
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/revoke/:deviceId", authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device không tồn tại",
      });
    }
    if (device.userEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thu hồi device này",
      });
    }
    if (device.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Device đã bị từ chối. Không thể thu hồi.",
      });
    }

    if (device.status === "locked") {
      return res.status(400).json({
        success: false,
        message: "Device đã bị khóa. Vui lòng liên hệ Admin.",
      });
    }

    await device.deleteOne();

    res.json({
      success: true,
      message:
        "Đã thu hồi đăng ký thành công. Bạn có thể đăng ký lại với Device ID mới.",
    });
  } catch (error) {
    console.error("Revoke device error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete("/revoke-by-email", authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email;

    // Tìm device của user (tất cả trạng thái ngoại trừ rejected, locked)
    const device = await Device.findOne({
      userEmail: userEmail,
      status: { $nin: ["rejected", "locked"] },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Bạn chưa đăng ký device nào",
      });
    }

    let message = "Đã thu hồi đăng ký thành công.";

    if (device.status === "pending") {
      message =
        "Đã hủy đăng ký đang chờ duyệt. Bạn có thể đăng ký lại với Device ID mới.";
    } else if (device.status === "approved" || device.status === "active") {
      message =
        "Đã thu hồi device đã duyệt. Bạn có thể đăng ký lại với Device ID mới để sử dụng trên máy khác.";
    }

    await device.deleteOne();

    res.json({
      success: true,
      message: message,
    });
  } catch (error) {
    console.error("Revoke by email error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
