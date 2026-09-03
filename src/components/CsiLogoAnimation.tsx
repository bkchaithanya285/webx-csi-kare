"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useIntro } from "@/context/IntroContext";

// Generate 16 surrounding floating energy fragments/particles
const fragments = Array.from({ length: 16 }).map((_, i) => {
  const angle = (i / 16) * 2 * Math.PI;
  const radius = 180 + Math.random() * 60;
  return {
    id: i,
    initialX: Math.cos(angle) * radius,
    initialY: Math.sin(angle) * radius,
    initialRotate: (Math.random() - 0.5) * 360,
    size: 20 + Math.random() * 25,
  };
});

export const CsiLogoAnimation: React.FC = () => {
  const { finishCsiAnimation } = useIntro();
  const [step, setStep] = useState<"emerge" | "assemble" | "popout" | "moveUp">("emerge");

  useEffect(() => {
    // Timeline sequence
    const t1 = setTimeout(() => setStep("assemble"), 800);
    const t2 = setTimeout(() => setStep("popout"), 2200);
    const t3 = setTimeout(() => setStep("moveUp"), 3600);
    const t4 = setTimeout(() => finishCsiAnimation(), 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [finishCsiAnimation]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center overflow-hidden pointer-events-none select-none">
      {/* Dark Web Grid & Particle Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/40 via-slate-950 to-black" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[140px]" />

      {/* Assembly Container */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Surrounding Particles/Pieces converging */}
        <AnimatePresence>
          {step !== "moveUp" &&
            fragments.map((frag) => (
              <motion.div
                key={frag.id}
                initial={{
                  x: frag.initialX * 2.5,
                  y: frag.initialY * 2.5,
                  opacity: 0,
                  scale: 0.2,
                  rotate: frag.initialRotate,
                }}
                animate={
                  step === "emerge"
                    ? {
                        x: frag.initialX,
                        y: frag.initialY,
                        opacity: 0.8,
                        scale: 1,
                        rotate: frag.initialRotate / 2,
                      }
                    : {
                        x: 0,
                        y: 0,
                        opacity: 0,
                        scale: 0.1,
                        rotate: 0,
                      }
                }
                transition={{
                  duration: step === "emerge" ? 0.7 : 1.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute rounded-lg border border-red-500/60 bg-gradient-to-br from-red-600/40 to-slate-900/80 backdrop-blur-md shadow-lg shadow-red-600/30"
                style={{ width: frag.size, height: frag.size }}
              />
            ))}
        </AnimatePresence>

        {/* Main CSI Logo Formation at Center */}
        <motion.div
          initial={{ scale: 0.1, opacity: 0, filter: "blur(20px)" }}
          animate={
            step === "emerge"
              ? { scale: 0.4, opacity: 0.4, filter: "blur(10px)" }
              : step === "assemble"
              ? { scale: 1, opacity: 1, filter: "blur(0px)" }
              : step === "popout"
              ? { scale: 1.35, opacity: 1, filter: "blur(0px)" }
              : { scale: 0.65, y: -280, opacity: 1, filter: "blur(0px)" }
          }
          transition={{
            duration: step === "moveUp" ? 1.2 : 0.8,
            type: step === "popout" ? "spring" : "keyframes",
            stiffness: 140,
            damping: 15,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative z-10 flex flex-col items-center justify-center"
        >
          {/* Outer Pulsing Glow Ring */}
          <div className="absolute -inset-6 rounded-full bg-red-600/30 blur-2xl animate-pulse" />
          
          <div className="relative w-44 h-44 md:w-56 md:h-56 filter drop-shadow-[0_0_35px_rgba(229,9,20,0.85)]">
            <Image
              src="/assets/csi logo.png"
              alt="CSI Club Logo"
              fill
              priority
              sizes="(max-width: 768px) 176px, 224px"
              className="object-contain"
            />
          </div>

          {/* Subtext glow under logo during center popout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: step === "popout" ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className="mt-4 text-center"
          >
            <span className="text-sm md:text-base font-bold tracking-[0.3em] uppercase text-red-400 glow-text-red">
              Computer Society of India
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
