"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useIntro } from "@/context/IntroContext";
import { GlobalBackground } from "./GlobalBackground";
import { SpiderIntroVideo } from "./SpiderIntroVideo";
import { CsiLogoAnimation } from "./CsiLogoAnimation";
import { GlassHeader } from "./GlassHeader";
import { AdminHeader } from "./AdminHeader";
import { Footer } from "./Footer";
import { WebCursorEffect } from "./WebCursorEffect";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { introStage, skipIntro } = useIntro();

  const isAdminRoute = pathname?.startsWith("/admin");
  const isVerifyRoute = pathname?.startsWith("/verify");
  const shouldBypassIntro = isAdminRoute || isVerifyRoute;

  useEffect(() => {
    // Skip intro on admin management and QR pass verification routes
    if (shouldBypassIntro && introStage !== "completed") {
      skipIntro();
    }
  }, [shouldBypassIntro, introStage, skipIntro]);

  // If admin route, QR verify route, or intro completed: render website
  if (shouldBypassIntro || introStage === "completed") {
    // Dedicated Standalone Admin Layout (Completely isolated from participant session/pass)
    if (isAdminRoute) {
      return (
        <GlobalBackground>
          <AdminHeader />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6">
            {children}
          </main>
          <footer className="w-full py-4 text-center border-t border-white/5 text-[11px] text-gray-500 font-mono tracking-wider">
            WEBX 2026 Admin Control Console • CSI Student Chapter KARE
          </footer>
        </GlobalBackground>
      );
    }

    return (
      <GlobalBackground>
        <WebCursorEffect />
        <GlassHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6">
          {children}
        </main>
        <Footer />
      </GlobalBackground>
    );
  }

  // Show intro video stage (Desktop only)
  if (introStage === "video") {
    return <SpiderIntroVideo />;
  }

  // Show CSI logo center animation stage (Desktop only)
  if (introStage === "csi_center") {
    return <CsiLogoAnimation />;
  }

  return (
    <GlobalBackground>
      <WebCursorEffect />
      <GlassHeader />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {children}
      </main>
      <Footer />
    </GlobalBackground>
  );
};
