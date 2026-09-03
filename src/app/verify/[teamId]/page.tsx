"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, CheckCircle2, Calendar, MapPin, Users, AlertTriangle } from "lucide-react";
import { getTeamByCodeOrEmail, TeamData } from "@/lib/db";

export default function PublicVerifyPage() {
  const params = useParams();
  const teamIdParam = (params?.teamId as string) || "WEB-001";
  
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeam() {
      try {
        const data = await getTeamByCodeOrEmail(teamIdParam);
        setTeam(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, [teamIdParam]);

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto py-20 px-4 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <h3 className="text-xl font-extrabold text-white">VERIFYING EVENT PASS...</h3>
        <p className="text-xs text-gray-400 font-mono">Checking official registration record for {teamIdParam}</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="w-full max-w-md mx-auto py-16 px-4">
        <div className="glass-card rounded-3xl p-8 border border-red-500/50 shadow-2xl flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-red-950/90 border-2 border-red-500 flex items-center justify-center">
            <AlertTriangle className="w-9 h-9 text-red-500 animate-pulse" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-500/40 text-[10px] font-extrabold uppercase tracking-widest mx-auto">
              VERIFICATION FAILED
            </span>
            <h2 className="text-2xl font-extrabold text-white">INVALID EVENT PASS</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              No registered team found with Team ID <span className="text-red-400 font-mono font-bold">{teamIdParam}</span>. This pass may have been deleted or never existed.
            </p>
          </div>

          <a
            href="/"
            className="px-6 py-2.5 rounded-xl glass-btn-primary text-xs font-bold uppercase tracking-wider"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  const displayTeam = team;

  return (
    <div className="w-full max-w-2xl mx-auto py-10 px-4">
      <div className="glass-card rounded-3xl p-8 border border-red-500/40 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        
        {/* Verification Status Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
            <ShieldCheck className="w-9 h-9 text-emerald-400" />
          </div>

          <div className="px-4 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-xs font-extrabold uppercase tracking-widest text-emerald-300">
            VALID WEBX EVENT PASS
          </div>

          <h2 className="text-3xl font-extrabold text-white">
            PASS VERIFICATION SUCCESSFUL
          </h2>
          <p className="text-xs text-gray-400">
            Official entry ticket verified for WEBX — Into the Web of Innovation.
          </p>
        </div>

        {/* Team Details Summary */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">TEAM NAME</span>
              <h3 className="text-xl font-extrabold text-white">{displayTeam.teamName}</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">TEAM ID</span>
              <span className="text-2xl font-extrabold font-mono text-red-500 glow-text-red block">
                {displayTeam.teamId}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="w-4 h-4 text-red-500" />
              <span><strong>Date:</strong> 3rd–4th October</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-red-500" />
              <span><strong>Venue:</strong> 8th Block Hall</span>
            </div>
          </div>
        </div>

        {/* 4 Participants List (No sensitive info like phone/room no exposed) */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-gray-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-red-500" />
            <span>VERIFIED TEAM MEMBERS (4 PARTICIPANTS)</span>
          </span>

          <div className="grid gap-2">
            {displayTeam.members.map((m, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <strong className="text-white text-sm block">{m.name}</strong>
                    <span className="text-gray-400">{m.department} • Year {m.year} • Sec {m.section}</span>
                  </div>
                </div>
                <span className="font-mono text-red-400 font-extrabold px-3 py-1 rounded bg-red-950/80 border border-red-500/30">
                  {m.regNo}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Notice */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-gray-400 text-center">
          🔒 Secure Verification Engine • Personal contact details hidden for privacy protection.
        </div>

      </div>
    </div>
  );
}
