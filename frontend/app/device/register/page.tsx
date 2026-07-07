"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiLock,
  FiLogOut,
  FiChevronDown,
  FiTrash2,
  FiAlertTriangle,
  FiRefreshCw,
  FiKey,
  FiArrowLeft,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const ADMIN_EMAIL = "buihaitrong.dev@gmail.com";

export default function DeviceRegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [deviceId, setDeviceId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }
    if (session.user?.email === ADMIN_EMAIL) {
      router.push("/admin/dashboard");
      return;
    }
    checkUserDevice();
  }, [session, status]);

  useEffect(() => {
    if (
      !deviceInfo?.expiresAt ||
      deviceInfo.status === "pending" ||
      deviceInfo.status === "locked" ||
      deviceInfo.status === "rejected"
    ) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiresAt = new Date(deviceInfo.expiresAt).getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
        checkUserDevice();
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [deviceInfo?.expiresAt, deviceInfo?.status]);

  const getToken = () => session?.user?.email || "";

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    if (!token) {
      toast.error("Vui lòng đăng nhập lại");
      throw new Error("No token");
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      toast.error("Phiên đăng nhập đã hết hạn");
      await signOut({ redirect: false });
      router.push("/login");
      throw new Error("Unauthorized");
    }

    return res;
  };

  const checkUserDevice = async () => {
    if (!session?.user?.email) return;
    try {
      const userEmail = session.user.email;
      const res = await fetchWithAuth(
        API_URL + "/api/device/user/" + userEmail,
      );
      if (!res) return;
      const data = await res.json();
      if (data.success && data.data) {
        const device = data.data;
        setDeviceStatus(device.status);
        setDeviceInfo({
          status: device.status,
          plan: device.plan,
          expiresAt: device.expiresAt,
          daysLeft: device.daysLeft,
          registeredAt: device.registeredAt,
          approvedAt: device.approvedAt,
          adminNote: device.adminNote,
          isLocked: device.isLocked || false,
          isActive: device.isActive,
        });
      } else {
        setDeviceStatus(null);
        setDeviceInfo(null);
      }
    } catch (error) {
      console.error("Check user device error:", error);
    }
  };

  const registerDevice = async () => {
    if (!deviceId || deviceId.length < 10) {
      toast.error("Vui lòng nhập Device ID hợp lệ (tối thiểu 10 ký tự)");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetchWithAuth(API_URL + "/api/device/register", {
        method: "POST",
        body: JSON.stringify({ deviceId }),
      });

      if (!res) return;
      const data = await res.json();
      if (data.success) {
        toast.success("Đăng ký thành công! Vui lòng đợi Admin duyệt.");
        setDeviceStatus("pending");
        await checkUserDevice();
        setDeviceId("");
      } else {
        toast.error(data.message || "Đăng ký thất bại");
      }
    } catch (error) {
      toast.error("Lỗi đăng ký device");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRevoke = async () => {
    if (!deviceInfo) {
      toast.error("Không có device để thu hồi");
      return;
    }

    let confirmMessage = "";
    if (deviceStatus === "pending") {
      confirmMessage = "Bạn có chắc muốn hủy đăng ký device đang chờ duyệt?";
    } else if (deviceStatus === "approved" || deviceStatus === "active") {
      confirmMessage =
        "Bạn có chắc muốn thu hồi device đã được duyệt?\n\nSau khi thu hồi:\n- Device sẽ bị xóa khỏi hệ thống\n- Bạn cần đăng ký lại với Device ID mới\n- Nếu đang sử dụng phần mềm, bạn sẽ bị ngắt kết nối";
    } else {
      confirmMessage = "Bạn có chắc muốn thu hồi device này?";
    }

    if (!confirm(confirmMessage)) return;

    setIsRevoking(true);
    try {
      const res = await fetchWithAuth(API_URL + "/api/device/revoke-by-email", {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        toast.success("" + data.message);
        setDeviceStatus(null);
        setDeviceInfo(null);
        setTimeLeft(null);
        localStorage.removeItem("deviceId");
      } else {
        toast.error(data.message || "Lỗi thu hồi");
      }
    } catch (error) {
      toast.error("Lỗi thu hồi device");
    } finally {
      setIsRevoking(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!session) return null;

  const isLocked = deviceStatus === "locked" || deviceInfo?.isLocked === true;
  const isDeviceActive =
    deviceStatus === "approved" || deviceStatus === "active";
  const canRegister =
    !isLocked &&
    !isDeviceActive &&
    deviceStatus !== "pending" &&
    deviceStatus !== "rejected";
  const canRevoke =
    !isLocked && deviceStatus !== "rejected" && deviceStatus !== null;

  return (
    <div className="min-h-screen">
      <nav className="border-b border-white/10 px-4 py-3 sticky top-0 z-50 bg-black/30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <span className="text-xl font-bold tracking-tight">
              <Link
                href="/"
                className="text-white hover:text-accent transition"
              >
                TRONGBUI<span className="text-accent">_</span>
              </Link>
            </span>
          </motion.div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition"
              >
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || ""}
                    width={28}
                    height={28}
                    className="rounded-full border border-white/10"
                  />
                )}
                <span className="text-gray-300 hidden sm:inline">
                  {session.user?.name}
                </span>
                <FiChevronDown size={16} className="text-gray-500" />
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-56 glass-card rounded-xl border border-white/10 py-1 z-50"
                  >
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-medium text-white">
                        {session.user?.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition flex items-center gap-2"
                    >
                      <FiLogOut size={16} />
                      Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 border border-white/10"
        >
          <div className="text-center mb-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center"
            >
              <FiKey className="text-accent" size={32} />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Device</h1>
            <p className="text-gray-400 text-sm mt-1">
              Nhập Device ID để đăng ký sử dụng phần mềm
            </p>
          </div>

          {deviceStatus && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl border border-white/10 bg-white/5"
            >
              <div className="flex items-center gap-3">
                {deviceStatus === "pending" && (
                  <>
                    <FiClock className="text-yellow-400" size={20} />
                    <div className="flex-1">
                      <p className="font-medium text-yellow-400">
                        Đang chờ duyệt
                      </p>
                      {deviceInfo?.registeredAt && (
                        <p className="text-xs text-gray-500">
                          Đăng ký lúc:{" "}
                          {new Date(deviceInfo.registeredAt).toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                      )}
                    </div>
                  </>
                )}
                {isDeviceActive && (
                  <>
                    <FiCheckCircle className="text-emerald-400" size={20} />
                    <div className="flex-1">
                      <p className="font-medium text-emerald-400">
                        Đã được duyệt
                      </p>
                      {timeLeft && (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <FiClock className="text-gray-400" size={14} />
                          <span className="text-gray-400">Còn:</span>
                          <span className="text-white font-mono font-bold">
                            {timeLeft.days > 0 && `${timeLeft.days}d `}
                            {String(timeLeft.hours).padStart(2, "0")}h{" "}
                            {String(timeLeft.minutes).padStart(2, "0")}m{" "}
                            {String(timeLeft.seconds).padStart(2, "0")}s
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {deviceStatus === "rejected" && (
                  <>
                    <FiXCircle className="text-red-400" size={20} />
                    <div className="flex-1">
                      <p className="font-medium text-red-400">Đã bị từ chối</p>
                      {deviceInfo?.adminNote && (
                        <p className="text-xs text-red-400/70">
                          Lý do: {deviceInfo.adminNote}
                        </p>
                      )}
                    </div>
                  </>
                )}
                {isLocked && (
                  <>
                    <FiLock className="text-red-400" size={20} />
                    <div className="flex-1">
                      <p className="font-medium text-red-400">Đã bị khóa</p>
                      <p className="text-xs text-gray-500">
                        Vui lòng liên hệ Admin
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {canRegister ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-gray-400 block mb-1.5">
                  Device ID
                </label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value.trim())}
                  placeholder="VD: 01a20940c456471e9b0b36b5..."
                  className="w-full input-dark rounded-xl px-4 py-3 text-white text-sm font-mono"
                />
              </div>
              <motion.button
                onClick={registerDevice}
                disabled={isVerifying}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full btn-primary py-3 rounded-xl text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <div className="spinner w-4 h-4"></div>
                    Đang xử lý...
                  </>
                ) : (
                  "Đăng ký"
                )}
              </motion.button>
            </motion.div>
          ) : null}

          {canRevoke && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 pt-6 border-t border-white/10"
            >
              <div
                className={`p-4 rounded-xl border ${
                  isDeviceActive
                    ? "bg-orange-500/10 border-orange-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isDeviceActive ? (
                    <FiRefreshCw className="text-orange-400 mt-0.5" size={20} />
                  ) : (
                    <FiAlertTriangle
                      className="text-red-400 mt-0.5"
                      size={20}
                    />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isDeviceActive ? "text-orange-400" : "text-red-400"
                      }`}
                    >
                      {isDeviceActive
                        ? "Bạn muốn đổi máy hoặc đăng ký lại?"
                        : deviceStatus === "pending"
                          ? "Bạn có muốn hủy đăng ký device đang chờ duyệt?"
                          : "Bạn có muốn thu hồi device này?"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isDeviceActive
                        ? "Thu hồi device đã duyệt sẽ xóa khỏi hệ thống. Bạn cần đăng ký lại với Device ID mới."
                        : "Device sẽ bị xóa khỏi hệ thống. Bạn có thể đăng ký lại sau."}
                    </p>
                    <button
                      onClick={handleRevoke}
                      disabled={isRevoking}
                      className={`mt-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2 ${
                        isDeviceActive
                          ? "bg-orange-500 hover:bg-orange-600"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {isRevoking ? (
                        <>
                          <div className="spinner w-4 h-4"></div>
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <FiTrash2 size={16} />
                          {isDeviceActive
                            ? "Thu hồi (đổi máy)"
                            : "Thu hồi đăng ký"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!canRegister && !deviceStatus && (
            <p className="text-center text-gray-500 text-sm">
              Không thể đăng ký tại thời điểm này
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
