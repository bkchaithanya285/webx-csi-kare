"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, User, ArrowLeft, ArrowRight, ShieldCheck, CreditCard, Clock } from "lucide-react";
import { Student } from "@/lib/db";

export default function ReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<{
    teamName: string;
    leadEmail: string;
    members: Student[];
    reservationId: string;
    expiresAt: number;
  } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("webx_draft_team");
    if (!raw) {
      router.push("/register");
      return;
    }
    try {
      setDraft(JSON.parse(raw));
    } catch (e) {
      router.push("/register");
    }
  }, [router]);

  if (!draft) {
    return (
      <div className="py-20 text-center text-gray-400 font-bold">
        Loading Review Summary...
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-red-500/30 shadow-2xl flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="px-4 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-xs font-bold uppercase tracking-widest text-red-400">
            STEP 2 OF 3 — VERIFY REGISTRATION DETAILS
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-wider text-white">
            REVIEW TEAM DETAILS
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Please double-check all 4 team members' SIS information before proceeding to payment.
          </p>
        </div>

        {/* 5-Minute Seat Reservation Alert */}
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex items-center justify-between text-amber-200 text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <span>Team Slot Temporarily Reserved for 5 Minutes</span>
          </div>
          <span className="text-xs font-mono bg-black/40 px-3 py-1 rounded-lg border border-amber-500/30">
            ID: {draft.reservationId}
          </span>
        </div>

        {/* Team Overview Card */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
              <Users className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">TEAM NAME</span>
              <h3 className="text-xl font-extrabold text-white">{draft.teamName}</h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">TOTAL FEE</span>
            <p className="text-xl font-extrabold text-red-400 glow-text-red">₹1,400 (₹350 × 4)</p>
          </div>
        </div>

        {/* 4 Members Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {draft.members.map((m, idx) => (
            <div key={idx} className="p-5 rounded-2xl glass-panel border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-extrabold uppercase text-red-400 flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Member {idx + 1}
                </span>
                <span className="text-xs font-mono text-gray-400">{m.regNo}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                <div>
                  <span className="text-gray-400 font-medium">Name:</span>{" "}
                  <strong className="text-white">{m.name}</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Dept:</span>{" "}
                  <strong className="text-white">{m.department} (Yr {m.year})</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Sec:</span>{" "}
                  <strong className="text-white">{m.section}</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Mobile:</span>{" "}
                  <strong className="text-white font-mono">{m.mobile}</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Accomm:</span>{" "}
                  <strong className="text-white">{m.accommodation}</strong>
                </div>
                {m.accommodation === "Hosteller" && (
                  <div>
                    <span className="text-gray-400 font-medium">Hostel:</span>{" "}
                    <strong className="text-white">{m.hostel} / {m.roomNo}</strong>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions: EDIT & PROCEED TO PAYMENT */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
          <button
            onClick={() => router.push("/register")}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl glass-btn-secondary font-bold text-xs uppercase flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>EDIT DETAILS</span>
          </button>

          <button
            onClick={() => router.push("/payment")}
            className="w-full sm:w-auto px-8 py-4 rounded-xl glass-btn-primary font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-red-950/60"
          >
            <CreditCard className="w-5 h-5" />
            <span>PROCEED TO PAYMENT (₹1,400)</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
}
