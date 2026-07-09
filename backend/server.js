const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const buildsDir = path.join(__dirname, "builds");
if (!fs.existsSync(buildsDir)) {
  fs.mkdirSync(buildsDir, { recursive: true });
  const osTypes = ["windows", "mac", "linux"];
  for (const os of osTypes) {
    const osDir = path.join(buildsDir, os);
    if (!fs.existsSync(osDir)) {
      fs.mkdirSync(osDir, { recursive: true });
    }
  }
}

// CORS
app.use(
  cors({
    origin: [
      "https://trongbui-swe.vercel.app",
      "https://trongbui-com.onrender.com",
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: "2gb" }));
app.use(express.urlencoded({ extended: true, limit: "2gb" }));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(compression());

app.use("/downloads", (req, res) => {
  res.status(403).json({
    success: false,
    message: "Access denied. Please use the download API.",
  });
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/device", require("./routes/device"));
app.use("/api/download", require("./routes/download"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
