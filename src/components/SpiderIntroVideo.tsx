"use client";

import React, { useRef, useState, useEffect } from "react";
import { useIntro } from "@/context/IntroContext";

export const SpiderIntroVideo: React.FC = () => {
  const { finishVideo } = useIntro();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const triggerFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      finishVideo();
    }, 400); // 400ms smooth fade transition
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.preload = "auto";
    video.muted = true; // Muted by default for 100% automatic unprompted autoplay compliance

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Video play fallback attempt:", err);
      });
    }
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none transition-opacity duration-500 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Hardware Accelerated Pure Cinematic Video Player Container fitted fully to screen */}
      <div className="relative w-full h-full flex items-center justify-center bg-black will-change-transform transform-gpu">
        <video
          ref={videoRef}
          src="/assets/intro.mp4"
          playsInline
          autoPlay
          preload="auto"
          muted
          onEnded={triggerFinish}
          onError={triggerFinish}
          className="w-full h-full object-contain max-w-full max-h-full bg-black shadow-2xl"
        />
      </div>
    </div>
  );
};
