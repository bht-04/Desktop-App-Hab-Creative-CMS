const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { authMiddleware } = require("../middleware/auth");
const DownloadLog = require("../models/DownloadLog");
const Device = require("../models/Device");
const Architecture = require("../models/Architecture");

const DOWNLOAD_BASE = path.join(__dirname, "../../downloads");
const ZIP_PASSWORD = process.env.ZIP_PASSWORD || "buihaitrong.com";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { osType, arch } = req.params;
    const dir = path.join(DOWNLOAD_BASE, osType, arch);
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
  limits: {
    fileSize: 1024 * 1024 * 2048,
  },
});

router.post(
  "/upload/:osType/:arch",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (req.user.email !== "buihaitrong.dev@gmail.com") {
        return res.status(403).json({
          success: false,
          message: "Chỉ Admin mới có quyền này!",
        });
      }

      const { osType, arch } = req.params;
      const { version, changelog } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Không có file được upload",
        });
      }

      const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
      const fileTypeMap = {
        exe: "exe",
        msi: "msi",
        dmg: "dmg",
        app: "app",
        pkg: "pkg",
        AppImage: "AppImage",
        deb: "deb",
        rpm: "rpm",
        zip: "zip",
        "7z": "7z",
      };
      const detectedType = fileTypeMap[ext] || "zip";

      const existing = await Architecture.findOne({
        osType: osType,
        arch: arch,
        fileName: req.file.filename,
      });

      if (existing) {
        if (fs.existsSync(existing.filePath)) {
          fs.unlinkSync(existing.filePath);
        }
        await existing.deleteOne();
      }

      const defaultArchMap = {
        windows: "x64",
        mac: "arm64",
        linux: "x86_64",
      };
      const isDefaultArch = arch === defaultArchMap[osType];

      const archData = new Architecture({
        osType: osType,
        arch: arch,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        fileType: detectedType,
        isActive: true,
        isDefault: isDefaultArch,
        password: ZIP_PASSWORD,
        uploadedBy: req.user.email,
        version: version || "1.0.0",
        changelog: changelog || "",
      });

      if (archData.isDefault) {
        await Architecture.updateMany(
          { osType: osType, isDefault: true },
          { isDefault: false },
        );
      }

      await archData.save();

      res.json({
        success: true,
        message: `Upload ${osType} (${arch}) thành công!`,
        data: {
          fileName: req.file.filename,
          osType: osType,
          arch: arch,
          size: (req.file.size / 1024 / 1024).toFixed(2) + " MB",
          fileType: detectedType,
          isDefault: archData.isDefault,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

router.get("/files/:osType", authMiddleware, async (req, res) => {
  try {
    const { osType } = req.params;
    const files = await Architecture.find({
      osType: osType,
      isActive: true,
    }).sort({ arch: 1 });

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error("Get files error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/default/:osType", async (req, res) => {
  try {
    const { osType } = req.params;
    const file = await Architecture.findOne({
      osType: osType,
      isActive: true,
      isDefault: true,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy file mặc định",
      });
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error("Get default error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.put("/default/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "buihaitrong.dev@gmail.com") {
      return res.status(403).json({
        success: false,
        message: "Chỉ Admin mới có quyền này!",
      });
    }

    const file = await Architecture.findById(req.params.id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy file",
      });
    }

    await Architecture.updateMany(
      { osType: file.osType, isDefault: true },
      { isDefault: false },
    );

    file.isDefault = true;
    await file.save();

    res.json({
      success: true,
      message: "Đã set làm mặc định",
    });
  } catch (error) {
    console.error("Set default error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/download/:osType/:arch?", async (req, res) => {
  try {
    const { osType, arch } = req.params;
    const { deviceId } = req.body;

    const validOS = ["windows", "mac", "linux"];
    if (!validOS.includes(osType)) {
      return res.status(400).json({
        success: false,
        message: "OS không hợp lệ. Chọn: windows, mac, linux",
      });
    }

    let fileData;
    if (arch) {
      fileData = await Architecture.findOne({
        osType: osType,
        arch: arch,
        isActive: true,
      });
    } else {
      fileData = await Architecture.findOne({
        osType: osType,
        isActive: true,
        isDefault: true,
      });
    }

    if (!fileData) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy file cho ${osType}${arch ? ` (${arch})` : ""}`,
      });
    }

    if (!fs.existsSync(fileData.filePath)) {
      return res.status(404).json({
        success: false,
        message: "File không tồn tại trên server",
      });
    }

    if (deviceId) {
      await DownloadLog.create({
        deviceId: deviceId,
        userEmail: deviceId || "guest",
        fileName: fileData.fileName,
        osType: osType,
        arch: fileData.arch,
        version: fileData.version,
        downloadDate: new Date(),
        ip: req.ip || req.connection.remoteAddress,
      });
    }

    fileData.downloads += 1;
    await fileData.save();

    res.download(fileData.filePath, fileData.fileName, (err) => {
      if (err) {
        console.error("Download error:", err);
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
});

router.delete("/file/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "buihaitrong.dev@gmail.com") {
      return res.status(403).json({
        success: false,
        message: "Chỉ Admin mới có quyền này!",
      });
    }

    const file = await Architecture.findById(req.params.id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy file",
      });
    }

    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await file.deleteOne();

    res.json({
      success: true,
      message: "Đã xóa file thành công",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/password", authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu Device ID",
      });
    }

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device không tồn tại",
      });
    }

    if (device.isLocked || device.status === "locked") {
      return res.status(403).json({
        success: false,
        message: "Device đã bị khóa",
      });
    }

    if (device.isExpired()) {
      return res.status(403).json({
        success: false,
        message: "License đã hết hạn",
      });
    }

    res.json({
      success: true,
      data: {
        password: ZIP_PASSWORD,
        message: "Mật khẩu giải nén file",
      },
    });
  } catch (error) {
    console.error("Get password error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.put("/file/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "buihaitrong.dev@gmail.com") {
      return res.status(403).json({
        success: false,
        message: "Chỉ Admin mới có quyền này!",
      });
    }

    const { id } = req.params;
    const { fileName, version, changelog, isDefault } = req.body;

    const file = await Architecture.findById(id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy file",
      });
    }

    if (fileName) file.fileName = fileName;
    if (version) file.version = version;
    if (changelog !== undefined) file.changelog = changelog;

    if (isDefault !== undefined) {
      if (isDefault) {
        await Architecture.updateMany(
          { osType: file.osType, isDefault: true },
          { isDefault: false },
        );
        file.isDefault = true;
      } else {
        file.isDefault = false;
      }
    }

    await file.save();

    res.json({
      success: true,
      message: "Cập nhật file thành công",
      data: file,
    });
  } catch (error) {
    console.error("Edit file error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
