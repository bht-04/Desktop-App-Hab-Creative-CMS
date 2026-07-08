import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import Footer from "./components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trang chủ",
  description: "Download HAB Creative Software",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body
        className={`${inter.className} min-h-screen flex flex-col relative`}
      >
        <Providers>
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#1a1a2e",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.05)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
