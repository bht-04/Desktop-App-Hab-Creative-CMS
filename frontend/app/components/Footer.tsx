"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FiHeart, FiGithub, FiLinkedin, FiMail } from "react-icons/fi";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-t border-white/10 bg-black/50 backdrop-blur-md mt-auto relative z-10"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="text-sm text-gray-500"
          >
            <span>© {currentYear} </span>
            <Link
              href="/"
              className="text-accent hover:text-accent-hover transition"
            >
              TRONGBUI_
            </Link>
          </motion.div>

          <div className="flex items-center gap-4">
            {[
              {
                icon: FiGithub,
                href: "https://github.com/trongbui",
                label: "GitHub",
              },
              {
                icon: FiLinkedin,
                href: "https://linkedin.com/in/trongbui",
                label: "LinkedIn",
              },
              {
                icon: FiMail,
                href: "mailto:buihaitrong.dev@gmail.com",
                label: "Email",
              },
            ].map((item, index) => (
              <motion.a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.2, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="text-gray-500 hover:text-white transition p-1.5 rounded-lg hover:bg-white/5"
                aria-label={item.label}
              >
                <item.icon size={18} />
              </motion.a>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-500 flex items-center gap-1"
          >
            <span>All rights reserved.</span>
          </motion.div>
        </div>
      </div>
    </motion.footer>
  );
}
