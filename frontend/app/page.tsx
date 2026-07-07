"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronDown,
  FiLogOut,
  FiArrowRight,
  FiMonitor,
  FiCpu,
  FiDownload,
} from "react-icons/fi";
import { FaGoogle, FaWindows, FaApple } from "react-icons/fa";
import { SiLinux } from "react-icons/si";
import Image from "next/image";
import Link from "next/link";

const ADMIN_EMAIL = "buihaitrong.dev@gmail.com";

const OS_LIST = [
  {
    id: "windows",
    label: "Windows",
    icon: FaWindows,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    gradient: "from-blue-500 to-blue-600",
    description: "Dành cho Windows 10/11 (x64)",
  },
  {
    id: "mac",
    label: "macOS",
    icon: FaApple,
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    gradient: "from-gray-500 to-gray-600",
    description: "Dành cho macOS Intel & Apple Silicon",
  },
  {
    id: "linux",
    label: "Linux",
    icon: SiLinux,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    gradient: "from-orange-500 to-orange-600",
    description: "Dành cho Ubuntu, Debian, Fedora...",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "unauthorized") {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.email === ADMIN_EMAIL) {
      router.push("/admin/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-card rounded-2xl p-8 max-w-sm w-full text-center border border-white/10"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center"
          >
            <FiCpu className="text-accent" size={40} />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Chào mừng bạn</h2>
          <p className="text-gray-400 text-sm mb-6">
            Đăng nhập để tải xuống phần mềm
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl border border-white/10 transition"
          >
            <FaGoogle className="text-red-400" size={20} />
            <span className="font-medium">Đăng nhập với Google</span>
          </button>
        </motion.div>
      </div>
    );
  }

  if (session.user?.email === ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-white/10 px-4 py-3 sticky top-0 z-50 bg-black/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl font-bold tracking-tight"
          >
            <Link href="/" className="text-white hover:text-accent transition">
              TRONGBUI<span className="text-accent">_</span>
            </Link>
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

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" as const }}
            className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
          >
            Chọn hệ điều hành của bạn
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 text-lg"
          >
            Tải xuống phiên bản phù hợp với hệ thống của bạn
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {OS_LIST.map((os) => {
            const Icon = os.icon;
            return (
              <motion.div
                key={os.id}
                variants={itemVariants}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                  transition: { type: "spring" as const, stiffness: 300 },
                }}
                className="group relative"
              >
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${os.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`}
                />
                <Link
                  href={`/os/${os.id}`}
                  className="glass-card rounded-2xl p-8 border border-white/10 hover:border-accent/30 transition-all duration-500 block relative overflow-hidden"
                >
                  <motion.div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-accent/5 to-transparent"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 90, 0],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />

                  <div className="flex flex-col items-center text-center relative z-10">
                    <motion.div
                      className={`p-6 rounded-2xl ${os.bgColor} mb-6`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring" as const, stiffness: 300 }}
                    >
                      <Icon className={os.color} size={64} />
                    </motion.div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                      {os.label}
                    </h2>

                    <p className="text-gray-400 text-sm mb-4">
                      {os.description}
                    </p>

                    <motion.div
                      className="flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition-all"
                      whileHover={{ x: 5 }}
                    >
                      <span>Xem các phiên bản</span>
                      <FiArrowRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 glass-card px-6 py-3 rounded-full border border-white/10">
            <FiDownload className="text-accent" size={18} />
            <span className="text-sm text-gray-400">
              Tải xuống an toàn và bảo mật
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
