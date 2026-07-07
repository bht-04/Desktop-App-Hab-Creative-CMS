"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaGoogle } from "react-icons/fa";
import toast from "react-hot-toast";

const ADMIN_EMAIL = "buihaitrong.dev@gmail.com";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loggedOut = searchParams.get("logged_out");
    if (loggedOut === "true") {
      toast.success("Đã đăng xuất thành công!");
      const url = new URL(window.location.href);
      url.searchParams.delete("logged_out");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "loading") return;

    if (session) {
      if (session.user?.email === ADMIN_EMAIL) {
        toast.success("👋 Chào mừng Admin!");
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    }
  }, [session, status, router]);

  const handleSignIn = () => {
    setIsLoading(true);
    signIn("google", {
      callbackUrl: "/admin/dashboard",
      redirect: false,
    }).then((result) => {
      setIsLoading(false);
      if (result?.error) {
        toast.error("Đăng nhập thất bại!");
      }
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
      <div className="glass-card rounded-2xl p-8 max-w-sm w-full border border-white/10 text-center">
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl border border-white/10 transition disabled:opacity-50"
        >
          {isLoading ? (
            <div className="spinner w-5 h-5"></div>
          ) : (
            <FaGoogle className="text-red-500" size={20} />
          )}
          <span>
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập với Google"}
          </span>
        </button>
      </div>
    </div>
  );
}
