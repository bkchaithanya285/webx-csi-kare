"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getTeamByCodeOrEmail } from "@/lib/db";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [rejectedEmail, setRejectedEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Strict check: Only accounts ending in @klu.ac.in are accepted
  const isKluEmail = (val: string) => {
    const clean = val.trim().toLowerCase();
    return clean.endsWith("@klu.ac.in");
  };

  const processUserAccount = async (userEmail: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();

    // If user clicked any account other than college mail: reject immediately
    if (!isKluEmail(cleanEmail)) {
      // Force sign out immediately so personal account is never logged in
      await signOut(auth).catch(() => {});

      // Clear any stored data
      localStorage.removeItem("webx_lead_email");
      localStorage.removeItem("webx_team_name");
      sessionStorage.removeItem("webx_confirmed_team");
      sessionStorage.removeItem("webx_draft_team");

      setRejectedEmail(cleanEmail);
      setError("Please use your college mail ID (@klu.ac.in) to login.");
      setGoogleLoading(false);
      return;
    }

    // Success: Verified @klu.ac.in account
    setRejectedEmail(null);
    setError("");
    localStorage.setItem("webx_lead_email", cleanEmail);

    await routeToActiveStep(cleanEmail);
  };

  const routeToActiveStep = async (email: string) => {
    const existingTeam = await getTeamByCodeOrEmail(email);
    if (existingTeam) {
      router.replace("/dashboard");
      return;
    }

    // Check if user has an active ongoing review or payment session
    const activeStep = sessionStorage.getItem("webx_registration_step");
    const activeExpiry = Number(sessionStorage.getItem("webx_payment_seat_lock_expiry"));
    if (activeExpiry && activeExpiry > Date.now()) {
      if (activeStep === "payment") {
        router.replace("/payment");
        return;
      }
      if (activeStep === "review") {
        router.replace("/review");
        return;
      }
    }

    router.replace("/register");
  };

  useEffect(() => {
    // 1. Purge any lingering non-college email session
    const stored = localStorage.getItem("webx_lead_email");
    if (stored && !isKluEmail(stored)) {
      localStorage.removeItem("webx_lead_email");
      localStorage.removeItem("webx_team_name");
      signOut(auth).catch(() => {});
    } else if (stored && isKluEmail(stored)) {
      // User is ALREADY logged in! Automatically direct them to their exact active step
      routeToActiveStep(stored);
      return;
    }

    // 2. Listen to Firebase auth state
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user?.email && isKluEmail(user.email)) {
        localStorage.setItem("webx_lead_email", user.email.toLowerCase());
        await routeToActiveStep(user.email.toLowerCase());
      }
    });

    // 3. Handle redirect result if applicable
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user?.email) {
          processUserAccount(result.user.email);
        }
      })
      .catch((err) => {
        console.warn("Redirect check:", err);
      });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setError("");
    setRejectedEmail(null);
    setGoogleLoading(true);

    const provider = new GoogleAuthProvider();
    // Shows ALL Google accounts logged into the user's browser (no restrictive domain filter in the popup)
    provider.setCustomParameters({
      prompt: "select_account",
    });

    try {
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user?.email || "";

      if (!userEmail) {
        setError("Google Sign-In failed: Could not retrieve email address.");
        setGoogleLoading(false);
        return;
      }

      await processUserAccount(userEmail);
    } catch (err: any) {
      console.warn("Google OAuth error:", err);

      if (
        err.code === "auth/popup-blocked" ||
        err.code === "auth/cancelled-popup-request" ||
        err.code === "auth/popup-closed-by-user" ||
        err.message?.includes("Cross-Origin-Opener-Policy") ||
        err.message?.includes("window.closed")
      ) {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch {
          setError("Google Authentication failed. Please allow popups for this site and try again.");
        }
      } else {
        setError(err.message || "Failed to authenticate with Google.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-14 px-4">
      <div className="glass-card rounded-3xl p-8 sm:p-10 border border-red-500/30 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center gap-2">
          <div className="relative w-16 h-16 mb-2">
            <Image src="/assets/csi logo.png" alt="CSI Logo" fill sizes="64px" className="object-contain" />
          </div>
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-400">STUDENT VERIFICATION</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-white">
            TEAM LEAD LOGIN
          </h2>
          <p className="text-xs text-gray-400 max-w-xs">
            Sign in with your Google account to proceed to team registration.
          </p>
        </div>

        {/* Clear College Mail Required Warning Card */}
        {rejectedEmail && (
          <div className="p-4 rounded-2xl bg-red-950/90 border border-red-500/70 text-red-100 flex flex-col gap-2 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>COLLEGE MAIL REQUIRED</span>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed">
              You selected <span className="font-mono text-red-300 font-semibold">{rejectedEmail}</span>. Please use your college mail ID (<strong className="text-emerald-400">@klu.ac.in</strong>) to login.
            </p>
          </div>
        )}

        {/* Standard generic error alert */}
        {!rejectedEmail && error && (
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-semibold flex items-start gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard "LOGIN WITH GOOGLE" Button */}
        <button
          type="button"
          disabled={googleLoading}
          onClick={handleGoogleSignIn}
          className="w-full py-4 px-6 rounded-2xl glass-btn-primary font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl shadow-red-950/60 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
        >
          {googleLoading ? (
            <span className="animate-pulse">CONNECTING TO GOOGLE...</span>
          ) : (
            <>
              <div className="p-1 bg-white rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <span>LOGIN WITH GOOGLE</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-center">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>College Mail (@klu.ac.in) Verified on Selection</span>
        </div>
      </div>
    </div>
  );
}
