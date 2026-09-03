"use client";

import React from "react";
import Image from "next/image";

export const GlobalBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white overflow-x-hidden selection:bg-red-600 selection:text-white">
      {/* Main Global Background Image */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/assets/overall bg.png"
          alt="WEBX Ambient Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-105 opacity-80 filter brightness-90 contrast-110"
        />
        
        {/* Subtle Dark Vignette & Web Grid Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-slate-950/40 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-black/90" />
        
        {/* Hardware-Accelerated Ambient Light Glow Orbs (GPU composited, zero frame drops) */}
        <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-red-600/15 rounded-full blur-[100px] pointer-events-none transform-gpu will-change-transform" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none transform-gpu will-change-transform" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
};
