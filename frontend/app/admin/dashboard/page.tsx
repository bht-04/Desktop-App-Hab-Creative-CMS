"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FiUsers,
  FiPhone,
  FiDownload,
  FiEdit,
  FiTrash2,
  FiShield,
  FiLock,
  FiUnlock,
  FiCalendar,
  FiMail,
  FiLoader,
  FiLogOut,
  FiPlus,
  FiX,
  FiClock,
  FiCheck,
  FiXCircle,
  FiUserCheck,
  FiUpload,
  FiInfo,
  FiFile,
  FiStar,
  FiHardDrive,
  FiFolder,
  FiBox,
  FiSave,
} from "react-icons/fi";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const OS_OPTIONS = [
  {
    id: "windows",
    label: "Windows",
    icon: <FiHardDrive className="text-blue-400" size={18} />,
  },
  {
    id: "mac",
    label: "macOS",
    icon: <FiHardDrive className="text-purple-400" size={18} />,
  },
  {
    id: "linux",
    label: "Linux",
    icon: <FiBox className="text-orange-400" size={18} />,
  },
];
const ARCH_OPTIONS = {
  windows: [{ value: "x64", label: "x64 (64-bit)" }],
  mac: [
    { value: "x64", label: "x64 (Intel)" },
    { value: "arm64", label: "arm64 (Apple Silicon)" },
  ],
  linux: [
    { value: "x86_64", label: "x86_64 (AppImage)" },
    { value: "amd64", label: "amd64 (Debian)" },
  ],
};

const FILE_TYPE_ICONS: Record<string, JSX.Element> = {
  exe: <FiHardDrive className="text-blue-400" size={18} />,
  dmg: <FiHardDrive className="text-purple-400" size={18} />,
  AppImage: <FiBox className="text-orange-400" size={18} />,
  deb: <FiFolder className="text-green-400" size={18} />,
  zip: <FiFolder className="text-yellow-400" size={18} />,
  default: <FiFile className="text-gray-400" size={18} />,
};

const FILE_TYPE_LABELS: Record<string, string> = {
  exe: "Windows Executable",
  dmg: "macOS Disk Image",
  AppImage: "Linux AppImage",
  deb: "Debian Package",
  zip: "Archive",
  default: "File",
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [devices, setDevices] = useState([]);
  const [pendingDevices, setPendingDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvePlan, setApprovePlan] = useState("30days");
  const [approveNote, setApproveNote] = useState("");

  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState<string>("windows");
  const [selectedArch, setSelectedArch] = useState<string>("x64");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [editingFile, setEditingFile] = useState<any>(null);
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editFileForm, setEditFileForm] = useState({
    fileName: "",
    version: "",
    changelog: "",
    isDefault: false,
  });

  const getToken = () => session?.user?.email || "";

  const fetchFiles = async (osType: string) => {
    setLoadingFiles(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/download/files/${osType}`, {
        headers: { Authorization: "Bearer " + token },
      });
      const result = await res.json();
      if (result.success) {
        setFiles(result.data);
      }
    } catch (error) {
      console.error("Fetch files error:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleUploadFile = async (osType: string, arch: string, file: File) => {
    if (!file) {
      toast.error("Vui lòng chọn file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("version", "1.0.0");

    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/download/upload/${osType}/${arch}`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
          },
          body: formData,
        },
      );

      const result = await res.json();
      if (result.success) {
        toast.success("Upload thành công!");
        fetchFiles(osType);
        setShowUploadModal(false);
        setSelectedFile(null);
      } else {
        toast.error(result.message || "Lỗi upload");
      }
    } catch (error) {
      toast.error("Lỗi upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/download/default/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Đã set làm mặc định");
        fetchFiles(selectedOS);
      } else {
        toast.error(result.message || "Lỗi set default");
      }
    } catch (error) {
      toast.error("Lỗi set default");
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!confirm("Xóa file này?")) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/download/file/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
        },
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Đã xóa file");
        fetchFiles(selectedOS);
      } else {
        toast.error(result.message || "Lỗi xóa file");
      }
    } catch (error) {
      toast.error("Lỗi xóa file");
    }
  };

  const handleEditFile = (file: any) => {
    setEditingFile(file);
    setEditFileForm({
      fileName: file.fileName,
      version: file.version || "1.0.0",
      changelog: file.changelog || "",
      isDefault: file.isDefault || false,
    });
    setShowEditFileModal(true);
  };

  const handleSaveEditFile = async () => {
    if (!editingFile) return;
    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/download/file/${editingFile._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            fileName: editFileForm.fileName,
            version: editFileForm.version,
            changelog: editFileForm.changelog,
            isDefault: editFileForm.isDefault,
          }),
        },
      );

      const result = await res.json();
      if (result.success) {
        toast.success("Đã cập nhật file");
        setShowEditFileModal(false);
        fetchFiles(selectedOS);
      } else {
        toast.error(result.message || "Lỗi cập nhật");
      }
    } catch (error) {
      toast.error("Lỗi cập nhật");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await signOut({
        redirect: false,
        callbackUrl: "/",
      });
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      toast.success("Đã đăng xuất!");
      router.push("/login");
    }
  };

  const fetchData = async () => {
    try {
      const token = getToken();
      const headers = { Authorization: "Bearer " + token };

      const [devicesRes, pendingRes, usersRes, logsRes, statsRes] =
        await Promise.all([
          fetch(API_URL + "/api/device/all", { headers }),
          fetch(API_URL + "/api/device/pending", { headers }),
          fetch(API_URL + "/api/admin/users", { headers }),
          fetch(API_URL + "/api/admin/logs", { headers }),
          fetch(API_URL + "/api/admin/stats", { headers }),
        ]);

      if (devicesRes.status === 401) {
        toast.error("Vui lòng đăng nhập lại");
        router.push("/login");
        return;
      }

      if (devicesRes.status === 403) {
        router.push("/");
        return;
      }

      const devicesData = await devicesRes.json();
      const pendingData = await pendingRes.json();
      const usersData = await usersRes.json();
      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      if (devicesData.success) setDevices(devicesData.data);
      if (pendingData.success) setPendingDevices(pendingData.data);
      if (usersData.success) setUsers(usersData.data);
      if (logsData.success) setLogs(logsData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (error) {
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (deviceId: string) => {
    try {
      const token = getToken();
      const res = await fetch(API_URL + "/api/device/approve/" + deviceId, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          plan: approvePlan,
          adminNote: approveNote,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Duyệt thành công!");
        setShowApproveModal(false);
        setApprovePlan("30days");
        setApproveNote("");
        fetchData();
      } else {
        toast.error(result.message || "Lỗi duyệt");
      }
    } catch (error) {
      toast.error("Lỗi duyệt device");
    }
  };

  const handleReject = async (deviceId: string) => {
    if (!confirm("Từ chối device này?")) return;
    try {
      const token = getToken();
      const res = await fetch(API_URL + "/api/device/reject/" + deviceId, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          adminNote: "Từ chối yêu cầu đăng ký",
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Đã từ chối device");
        fetchData();
      } else {
        toast.error(result.message || "Lỗi từ chối");
      }
    } catch (error) {
      toast.error("Lỗi từ chối device");
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.user?.email !== "buihaitrong.dev@gmail.com") {
      router.push("/");
      return;
    }
    fetchData();
    fetchFiles("windows");
  }, [session, status, router]);

  const updateDevice = async (deviceId: string, data: any) => {
    try {
      const token = getToken();
      const res = await fetch(API_URL + "/api/admin/devices/" + deviceId, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Cập nhật thành công");
        fetchData();
        setShowEditModal(false);
      } else {
        toast.error(result.message || "Lỗi cập nhật");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Lỗi cập nhật");
    }
  };

  const deleteDevice = async (deviceId: string) => {
    if (!confirm("Xóa device này?")) return;
    try {
      const token = getToken();
      const res = await fetch(API_URL + "/api/admin/devices/" + deviceId, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + getToken() },
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Xóa thành công");
        fetchData();
      } else {
        toast.error(result.message || "Lỗi xóa");
      }
    } catch (error) {
      toast.error("Lỗi xóa");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <FiLoader className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (session?.user?.email !== "buihaitrong.dev@gmail.com") {
    return null;
  }

  const planLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Chờ duyệt", color: "badge-warning" },
    approved: { label: "Đã duyệt", color: "badge-success" },
    active: { label: "Hoạt động", color: "badge-success" },
    rejected: { label: "Từ chối", color: "badge-danger" },
    locked: { label: "Đã khóa", color: "badge-danger" },
    "3days": { label: "3 ngày", color: "badge-info" },
    "5days": { label: "5 ngày", color: "badge-info" },
    "7days": { label: "7 ngày", color: "badge-info" },
    "15days": { label: "15 ngày", color: "badge-info" },
    "30days": { label: "30 ngày", color: "badge-info" },
    forever: { label: "Vĩnh viễn", color: "badge-success" },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl">
              <FiShield className="text-accent" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">
                Quản lý device và file tải xuống
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 transition flex items-center gap-2 text-sm bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl border border-red-500/20"
          >
            <FiLogOut size={16} />
            Đăng xuất
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {
                icon: FiPhone,
                label: "Tổng device",
                value: stats.totalDevices,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                icon: FiClock,
                label: "Chờ duyệt",
                value: pendingDevices.length,
                color: "text-yellow-400",
                bg: "bg-yellow-500/10",
              },
              {
                icon: FiUsers,
                label: "Người dùng",
                value: stats.totalUsers,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                icon: FiDownload,
                label: "Lượt tải",
                value: stats.totalDownloads,
                color: "text-purple-400",
                bg: "bg-purple-500/10",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="glass-card rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${item.bg} rounded-lg`}>
                    <item.icon className={item.color} size={16} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {item.value}
                    </p>
                    <p className="text-sm text-gray-500">{item.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="glass-card rounded-xl p-4 md:p-6 mb-6 border border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <FiDownload size={16} />
              Quản lý file tải xuống
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                {OS_OPTIONS.map((os) => (
                  <button
                    key={os.id}
                    onClick={() => {
                      setSelectedOS(os.id);
                      fetchFiles(os.id);
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition ${
                      selectedOS === os.id
                        ? "bg-accent/20 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {os.icon}
                    {os.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(true);
                  setSelectedFile(null);
                  setSelectedArch("x64");
                }}
                className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <FiPlus size={16} />
                Upload file
              </button>
            </div>
          </div>

          {loadingFiles ? (
            <div className="flex justify-center py-12">
              <FiLoader className="animate-spin text-accent" size={28} />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FiFile className="mx-auto mb-3" size={48} />
              <p className="text-gray-400">Chưa có file nào cho {selectedOS}</p>
              <p className="text-sm mt-1 text-gray-500">
                Click "Upload file" để thêm
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dung lượng
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lượt tải
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr
                      key={file._id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                            {FILE_TYPE_ICONS[file.fileType] ||
                              FILE_TYPE_ICONS.default}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {file.fileName}
                            </p>
                            <p className="text-xs text-gray-500">{file.arch}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400">
                          {FILE_TYPE_LABELS[file.fileType] || file.fileType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400">
                          {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400">
                          {file.downloads || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {file.isDefault ? (
                          <span className="badge-success px-2 py-1 rounded-full text-xs font-medium">
                            ⭐ Mặc định
                          </span>
                        ) : (
                          <span className="badge-info px-2 py-1 rounded-full text-xs font-medium">
                            Có sẵn
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditFile(file)}
                            className="p-1.5 text-gray-500 hover:text-blue-400 transition rounded-lg hover:bg-blue-500/10"
                            title="Chỉnh sửa"
                          >
                            <FiEdit size={16} />
                          </button>
                          {!file.isDefault && (
                            <button
                              onClick={() => handleSetDefault(file._id)}
                              className="p-1.5 text-gray-500 hover:text-yellow-400 transition rounded-lg hover:bg-yellow-500/10"
                              title="Set mặc định"
                            >
                              <FiStar size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFile(file._id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition rounded-lg hover:bg-red-500/10"
                            title="Xóa"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pendingDevices.length > 0 && (
          <div className="glass-card rounded-xl p-4 mb-6 border border-yellow-500/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                <FiClock size={16} className="text-yellow-500" />
                Đang chờ duyệt ({pendingDevices.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                      Device ID
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                      User
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                      Đăng ký lúc
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDevices.map((device: any) => (
                    <tr
                      key={device._id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="py-2 px-3">
                        <span className="font-mono text-xs text-gray-400">
                          {device.deviceId.substring(0, 16)}...
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <FiMail className="text-gray-500" size={14} />
                          <span className="text-sm text-gray-300">
                            {device.userEmail}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-sm text-gray-500">
                          {new Date(device.registeredAt).toLocaleString(
                            "vi-VN",
                          )}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDevice(device);
                              setShowApproveModal(true);
                            }}
                            className="px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm transition"
                          >
                            <FiCheck size={14} className="inline mr-1" /> Duyệt
                          </button>
                          <button
                            onClick={() => handleReject(device.deviceId)}
                            className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition"
                          >
                            <FiXCircle size={14} className="inline mr-1" /> Từ
                            chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="glass-card rounded-xl p-4 border border-white/10">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FiShield size={16} className="text-accent" />
            Danh sách device
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hết hạn
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device: any) => {
                  const statusLabel = planLabels[device.status] || {
                    label: device.status,
                    color: "badge-info",
                  };
                  return (
                    <tr
                      key={device._id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-gray-400">
                          {device.deviceId.substring(0, 16)}...
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FiMail className="text-gray-500" size={14} />
                          <span className="text-sm text-gray-300">
                            {device.userEmail}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabel.color}`}
                        >
                          {statusLabel.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400">
                          {planLabels[device.plan]?.label || device.plan}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500">
                          {device.expiresAt
                            ? new Date(device.expiresAt).toLocaleDateString(
                                "vi-VN",
                              )
                            : "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {device.status !== "pending" &&
                            device.status !== "rejected" && (
                              <button
                                onClick={() => {
                                  setSelectedDevice(device);
                                  setShowEditModal(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-blue-400 transition rounded-lg hover:bg-blue-500/10"
                              >
                                <FiEdit size={16} />
                              </button>
                            )}
                          <button
                            onClick={() => deleteDevice(device.deviceId)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition rounded-lg hover:bg-red-500/10"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showApproveModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiUserCheck size={20} className="text-accent" />
                Duyệt Device
              </h3>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovePlan("30days");
                  setApproveNote("");
                }}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Device ID
                </label>
                <p className="text-sm text-white font-mono break-all">
                  {selectedDevice.deviceId}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">User</label>
                <p className="text-sm text-white">{selectedDevice.userEmail}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Gói sử dụng
                </label>
                <select
                  value={approvePlan}
                  onChange={(e) => setApprovePlan(e.target.value)}
                  className="w-full bg-black rounded-xl px-4 py-2.5 text-white text-sm"
                >
                  <option value="3days">3 ngày</option>
                  <option value="5days">5 ngày</option>
                  <option value="7days">7 ngày</option>
                  <option value="15days">15 ngày</option>
                  <option value="30days">30 ngày</option>
                  <option value="forever">Vĩnh viễn</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setApprovePlan("30days");
                    setApproveNote("");
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleApprove(selectedDevice.deviceId)}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-white text-sm font-medium"
                >
                  Duyệt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-1">
              Chỉnh sửa Device
            </h3>
            <p className="text-xs text-gray-500 font-mono mb-4">
              {selectedDevice.deviceId}
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Plan</label>
                <select
                  defaultValue={selectedDevice.plan}
                  className="w-full bg-black rounded-xl px-4 py-2.5 text-white text-sm"
                  onChange={(e) =>
                    setSelectedDevice({
                      ...selectedDevice,
                      plan: e.target.value,
                    })
                  }
                >
                  <option value="3days">3 ngày</option>
                  <option value="5days">5 ngày</option>
                  <option value="7days">7 ngày</option>
                  <option value="15days">15 ngày</option>
                  <option value="30days">30 ngày</option>
                  <option value="forever">Vĩnh viễn</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Trạng thái
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const newStatus =
                        selectedDevice.status === "locked"
                          ? "active"
                          : selectedDevice.status;
                      setSelectedDevice({
                        ...selectedDevice,
                        status: newStatus,
                        isLocked: false,
                      });
                    }}
                    className={`flex-1 py-2.5 rounded-xl border transition text-sm flex items-center justify-center gap-2 ${
                      selectedDevice.isLocked === false
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <FiUnlock size={16} /> Mở khóa
                  </button>
                  <button
                    onClick={() =>
                      setSelectedDevice({
                        ...selectedDevice,
                        status: "locked",
                        isLocked: true,
                      })
                    }
                    className={`flex-1 py-2.5 rounded-xl border transition text-sm flex items-center justify-center gap-2 ${
                      selectedDevice.isLocked === true
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <FiLock size={16} /> Khóa
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    const updateData = {
                      plan: selectedDevice.plan,
                      status: selectedDevice.status,
                      isLocked: selectedDevice.isLocked,
                      notes: selectedDevice.notes || "",
                    };
                    updateDevice(selectedDevice.deviceId, updateData);
                  }}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-white text-sm font-medium"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiUpload size={20} className="text-accent" />
                Upload file
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Hệ điều hành
                </label>
                <select
                  value={selectedOS}
                  onChange={(e) => setSelectedOS(e.target.value)}
                  className="w-full bg-black rounded-xl px-4 py-2.5 text-white text-sm"
                >
                  {OS_OPTIONS.map((os) => (
                    <option key={os.id} value={os.id} className="bg-black">
                      {os.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Kiến trúc
                </label>
                <select
                  value={selectedArch}
                  onChange={(e) => setSelectedArch(e.target.value)}
                  className="w-full bg-black rounded-xl px-4 py-2.5 text-white text-sm"
                >
                  {ARCH_OPTIONS[selectedOS as keyof typeof ARCH_OPTIONS]?.map(
                    (arch) => (
                      <option key={arch.value} value={arch.value}>
                        {arch.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Chọn file
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                    }
                  }}
                  className="w-full bg-black rounded-xl px-4 py-2.5 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-white hover:file:bg-accent/30"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hỗ trợ mọi định dạng (tối đa 2GB)
                </p>
              </div>

              {selectedFile && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-sm text-accent">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (selectedFile) {
                      handleUploadFile(selectedOS, selectedArch, selectedFile);
                    } else {
                      toast.error("Vui lòng chọn file");
                    }
                  }}
                  disabled={!selectedFile || uploading}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <FiLoader className="animate-spin" size={16} />
                      Đang upload...
                    </>
                  ) : (
                    <>
                      <FiUpload size={16} />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditFileModal && editingFile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiEdit size={20} className="text-accent" />
                Chỉnh sửa file
              </h3>
              <button
                onClick={() => {
                  setShowEditFileModal(false);
                  setEditingFile(null);
                }}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Tên file
                </label>
                <input
                  type="text"
                  value={editFileForm.fileName}
                  onChange={(e) =>
                    setEditFileForm({
                      ...editFileForm,
                      fileName: e.target.value,
                    })
                  }
                  className="w-full bg-black rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Phiên bản
                </label>
                <input
                  type="text"
                  value={editFileForm.version}
                  onChange={(e) =>
                    setEditFileForm({
                      ...editFileForm,
                      version: e.target.value,
                    })
                  }
                  className="w-full bg-black rounded-xl px-4 py-2.5 text-white text-sm"
                  placeholder="1.0.0"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editFileForm.isDefault}
                  onChange={(e) =>
                    setEditFileForm({
                      ...editFileForm,
                      isDefault: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-accent rounded border-white/20 bg-transparent"
                />
                <label className="text-sm text-gray-400">
                  Đặt làm mặc định
                </label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowEditFileModal(false);
                    setEditingFile(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEditFile}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2"
                >
                  <FiSave size={16} />
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
