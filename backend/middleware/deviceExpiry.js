const Device = require("../models/Device");

async function checkDeviceExpiry(req, res, next) {
  try {
    const deviceId =
      req.body.deviceId || req.params.deviceId || req.query.deviceId;

    if (!deviceId) {
      return next();
    }

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return next();
    }

    if (device.isExpired && device.isExpired() && device.plan !== "forever") {
      device.isLocked = true;
      device.status = "locked";
      device.isActive = false;
      await device.save();
    }

    req.device = device;
    next();
  } catch (error) {
    console.error("Device expiry check error:", error);
    next();
  }
}

module.exports = checkDeviceExpiry;
