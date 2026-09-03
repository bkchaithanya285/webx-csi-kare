"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Calendar, MapPin, Users, Award } from "lucide-react";
import { TeamData } from "@/lib/db";

interface PrintableEventPassProps {
  team: TeamData;
  domId: string;
}

export const PrintableEventPass: React.FC<PrintableEventPassProps> = ({ team, domId }) => {
  const verifyUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/verify/${team.teamId}`
    : `https://webx2026.vercel.app/verify/${team.teamId}`;

  return (
    <div
      id={domId}
      style={{ width: "960px", minHeight: "560px" }}
      className="bg-slate-950 text-white p-8 rounded-3xl border-2 border-red-500/50 shadow-2xl relative overflow-hidden flex flex-col justify-between font-sans select-none"
    >
      {/* Background Spider Glow Effects */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-red-900/25 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex items-center justify-between border-b border-white/15 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          {/* CSI Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/csi logo.png"
            alt="CSI Logo"
            className="w-12 h-12 object-contain filter drop-shadow-[0_0_10px_rgba(229,9,20,0.7)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wider text-white">CSI KARE</span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500/50 text-[10px] font-extrabold text-red-400 tracking-widest uppercase">
                OFFICIAL ENTRY PASS
              </span>
            </div>
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-mono">
              WEBX 2026 • 24-HOUR HACKATHON
            </p>
          </div>
        </div>

        {/* Team ID Big Tag */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
              OFFICIAL TEAM ID
            </span>
            <span className="text-3xl font-extrabold font-mono text-red-500 tracking-wider">
              {team.teamId}
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              team.paymentStatus === "VERIFIED"
                ? "bg-emerald-950 border border-emerald-500/60 text-emerald-300"
                : "bg-amber-950 border border-amber-500/60 text-amber-300"
            }`}
          >
            {team.paymentStatus}
          </span>
        </div>
      </div>

      {/* TEAM OVERVIEW & QR ROW */}
      <div className="grid grid-cols-4 gap-6 my-4 relative z-10">
        <div className="col-span-3 flex flex-col justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold text-red-400 uppercase tracking-widest block mb-1">
              TEAM NAME
            </span>
            <h2 className="text-2xl font-black text-white tracking-wide truncate">
              {team.teamName}
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Team Lead: <span className="text-gray-200 font-semibold">{team.leadEmail}</span> • UTR:{" "}
              <span className="text-gray-300">{team.utrNumber || "N/A"}</span>
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-300 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-400" />
              <span><strong>Date:</strong> 3rd–4th October 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400" />
              <span><strong>Venue:</strong> 8th Block Seminar Hall, KARE</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <Award className="w-4 h-4" />
              <span><strong>2EE Credits</strong> Eligible</span>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="col-span-1 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-3">
          <div className="bg-white p-2 rounded-xl shadow-lg">
            <QRCodeSVG
              value={verifyUrl}
              size={90}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <span className="text-[9px] font-mono text-gray-400 mt-2 tracking-wider uppercase text-center">
            Scan to Verify
          </span>
        </div>
      </div>

      {/* 4 MEMBERS CARDS GRID */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-red-400" />
            <span>CONFIRMED PARTICIPANTS (4 MEMBERS)</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {team.members.map((m, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                  {idx === 0 ? "L" : idx + 1}
                </span>
                <div className="truncate max-w-[240px]">
                  <strong className="text-white block truncate">
                    {m.name || "Member " + (idx + 1)} {idx === 0 && <span className="text-[10px] text-red-400 font-normal">(Leader)</span>}
                  </strong>
                  <span className="text-gray-400 text-[11px] block">
                    {m.department} • Year {m.year} • Sec {m.section} • {m.mobile}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-red-400 font-extrabold px-2.5 py-1 rounded bg-red-950/80 border border-red-500/30 text-[11px] block">
                  {m.regNo}
                </span>
                <span className="text-[9px] text-gray-400 mt-0.5 block">
                  {m.accommodation} {m.hostel ? `(${m.hostel})` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[10px] text-gray-400 relative z-10">
        <span>🔒 Computer Society of India • KARE Student Chapter Official Document</span>
        <span className="font-mono">PASS TOKEN: WEBX-{team.teamId}-{team.utrNumber?.slice(-4) || "KLU"}</span>
      </div>
    </div>
  );
};
