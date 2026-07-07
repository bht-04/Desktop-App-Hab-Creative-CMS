"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiLogOut,
  FiDownload,
  FiChevronDown,
  FiMonitor,
  FiFile,
  FiCpu,
  FiArrowLeft,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiLock,
} from "react-icons/fi";
import { FaWindows, FaApple } from "react-icons/fa";
import { SiLinux } from "react-icons/si";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const ADMIN_EMAIL = "buihaitrong.dev@gmail.com";

const OS_CONFIG = {
  windows: {
    label: "Windows",
    icon: FaWindows,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    iconBg: "bg-blue-500/20",
    gradient: "from-blue-500 to-blue-600",
  },
  mac: {
    label: "macOS",
    icon: FaApple,
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20",
    iconBg: "bg-gray-500/20",
    gradient: "from-gray-500 to-gray-600",
  },
  linux: {
    label: "Linux",
    icon: SiLinux,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    iconBg: "bg-orange-500/20",
    gradient: "from-orange-500 to-orange-600",
  },
};

export default function OSDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const osType = params.osType as string;
  const [deviceId, setDeviceId] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<any>(null);
  const osConfig = OS_CONFIG[osType as keyof typeof OS_CONFIG];

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
    fetchFiles();
  }, [session, status, osType]);

  useEffect(() => {
    if (
      !deviceInfo?.expiresAt ||
      deviceInfo.status === "pending" ||
      deviceInfo.status === "locked"
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
        setDeviceId(device.deviceId);
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

  const fetchFiles = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/download/files/${osType}`,
      );
      if (!res) return;
      const data = await res.json();
      if (data.success) {
        setAvailableFiles(data.data);
      }
    } catch (error) {
      console.error("Fetch files error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId: string) => {
    const selectedFile = availableFiles.find((f) => f._id === fileId);
    if (!selectedFile) {
      toast.error("File không tồn tại");
      return;
    }

    setDownloadingFile(fileId);

    try {
      const deviceIdParam = deviceId || "guest";
      const res = await fetch(
        `${API_URL}/api/download/download/${osType}/${selectedFile.arch}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: deviceIdParam }),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Download failed");
      }

      const fileName = selectedFile.fileName;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Tải xuống thành công!");
    } catch (error: any) {
      toast.error(error.message || "Lỗi tải xuống");
    } finally {
      setDownloadingFile(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!session) return null;

  const Icon = osConfig.icon;
  const isLocked = deviceStatus === "locked" || deviceInfo?.isLocked === true;
  const isDeviceActive =
    deviceStatus === "approved" || deviceStatus === "active";

  return (
    <div className="min-h-screen">
      <nav className="border-b border-white/10 px-4 py-3 sticky top-0 z-50 bg-black/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Link
                href="/device/register"
                className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 transition"
              >
                <FiMonitor size={16} />
                Device
              </Link>
            </motion.div>

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

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`${osConfig.bgColor} rounded-2xl p-6 mb-6 border ${osConfig.borderColor}`}
        >
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={`p-4 rounded-xl ${osConfig.iconBg}`}
            >
              <Icon className={osConfig.color} size={40} />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {osConfig.label}
              </h1>
              <p className="text-gray-400">
                Chọn phiên bản phù hợp với hệ thống của bạn
              </p>
            </div>
          </div>
        </motion.div>

        {deviceStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4 mb-6 border border-white/10"
          >
            <div className="flex items-center gap-3">
              {deviceStatus === "pending" && (
                <>
                  <FiClock className="text-yellow-400" size={20} />
                  <div>
                    <p className="text-yellow-400 font-medium">
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
                  <div>
                    <p className="text-emerald-400 font-medium">
                      Đã được duyệt
                    </p>
                    {timeLeft && (
                      <div className="flex items-center gap-2 text-sm">
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
                  <div>
                    <p className="text-red-400 font-medium">Đã bị từ chối</p>
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
                  <div>
                    <p className="text-red-400 font-medium">Đã bị khóa</p>
                    <p className="text-xs text-gray-500">
                      Vui lòng liên hệ Admin
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl border border-white/10 overflow-hidden"
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="spinner w-6 h-6"></div>
            </div>
          ) : availableFiles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Link
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Hệ điều hành
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Dung lượng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {availableFiles.map((file, index) => (
                    <motion.tr
                      key={file._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="py-3 px-6">
                        <motion.button
                          onClick={() => handleDownload(file._id)}
                          disabled={downloadingFile === file._id}
                          whileHover={{ scale: 1.02, x: 3 }}
                          whileTap={{ scale: 0.98 }}
                          className={`text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 transition ${
                            downloadingFile === file._id
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {downloadingFile === file._id ? (
                            <>
                              <div className="spinner w-4 h-4"></div>
                              Đang tải...
                            </>
                          ) : (
                            <>
                              <FiDownload size={14} />
                              {file.isDefault ? "Tải xuống" : file.fileName}
                            </>
                          )}
                        </motion.button>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-sm text-gray-400">
                          {file.fileType}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-sm text-gray-400">
                          {osConfig.label}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({file.arch})
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-sm text-gray-500">
                          {(file.fileSize / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FiFile className="mx-auto mb-3" size={40} />
              <p>Chưa có file cho {osConfig.label}</p>
              <p className="text-sm mt-1">Vui lòng quay lại sau</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
