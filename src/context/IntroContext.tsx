"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type IntroStage = "check" | "video" | "csi_center" | "completed";

interface IntroContextType {
  introStage: IntroStage;
  setIntroStage: (stage: IntroStage) => void;
  finishVideo: () => void;
  finishCsiAnimation: () => void;
  skipIntro: () => void;
}

const IntroContext = createContext<IntroContextType | undefined>(undefined);

export const IntroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [introStage, setIntroStage] = useState<IntroStage>("check");

  useEffect(() => {
    // Check session storage on initial mount
    const isCompleted = sessionStorage.getItem("webx_intro_completed");

    // Play cinematic video intro on both Mobile and Desktop
    if (isCompleted === "true") {
      setIntroStage("completed");
    } else {
      setIntroStage("video");
    }
  }, []);

  const finishVideo = () => {
    setIntroStage("csi_center");
  };

  const finishCsiAnimation = () => {
    sessionStorage.setItem("webx_intro_completed", "true");
    setIntroStage("completed");
  };

  const skipIntro = () => {
    sessionStorage.setItem("webx_intro_completed", "true");
    setIntroStage("completed");
  };

  return (
    <IntroContext.Provider
      value={{
        introStage,
        setIntroStage,
        finishVideo,
        finishCsiAnimation,
        skipIntro,
      }}
    >
      {children}
    </IntroContext.Provider>
  );
};

export const useIntro = () => {
  const context = useContext(IntroContext);
  if (!context) {
    throw new Error("useIntro must be used within an IntroProvider");
  }
  return context;
};
