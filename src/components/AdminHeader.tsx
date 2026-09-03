"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";

export const AdminHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full px-4 py-3 sm:px-8 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: CSI Logo & Official Admin Badge */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/csi logo.png"
              alt="CSI Club Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(229,9,20,0.6)]"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-wider text-white">
                CSI KARE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/50 text-[10px] font-extrabold text-red-400 uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-red-400" />
                ADMIN CONSOLE
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
              WEBX 2026 Management Portal
            </span>
          </div>
        </div>

        {/* Right: Quick Link to Public Site */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Participant View in New Tab"
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider glass-btn-secondary text-gray-300 hover:text-white flex items-center gap-1.5 border border-white/10 hover:border-red-500/40"
          >
            <span>View Public Site</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </Link>
        </div>
      </div>
    </header>
  );
};
