"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Calendar, MapPin, Users, AlertTriangle, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import { getTeamByCodeOrEmail, TeamData } from "@/lib/db";
import { getTeamLeadInfo } from "@/lib/teamUtils";

function VerifyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTeamIdParam = (params?.teamId as string) || "WEB-001";
  const queryOverride = searchParams?.get("team") || searchParams?.get("lead") || searchParams?.get("id") || "";
  const activeLookup = queryOverride || rawTeamIdParam;

  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    async function loadTeam() {
      setLoading(true);
      try {
        const data = await getTeamByCodeOrEmail(activeLookup);
        setTeam(data);
      } catch (err) {
        console.error("Verification load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, [activeLookup]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim();
    if (!clean) return;
    setSearching(true);
    setSearchError("");
    try {
      const data = await getTeamByCodeOrEmail(clean);
      if (data) {
        setTeam(data);
        if (data.teamId) {
          router.replace(`/verify/${data.teamId}`);
        }
      } else {
        setSearchError(`No verified registration found for "${clean}".`);
      }
    } catch (err) {
      setSearchError("Lookup failed. Please check your connection and try again.");
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto py-20 px-4 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <h3 className="text-xl font-extrabold text-white">VERIFYING EVENT PASS...</h3>
        <p className="text-xs text-gray-400 font-mono">Checking official registration record for {rawTeamIdParam}</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 flex flex-col gap-6">
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
              No registered team found matching <span className="text-red-400 font-mono font-bold">{rawTeamIdParam}</span>.
            </p>
          </div>

          {/* Quick Lookup by Reg No / Team ID */}
          <form onSubmit={handleSearch} className="w-full flex flex-col gap-2">
            <span className="text-xs text-gray-300 font-bold text-left">Search by Student Reg No or Team ID:</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. WEB-038 or 99240040417"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs text-white"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 rounded-xl glass-btn-primary text-xs font-bold uppercase disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
            {searchError && <span className="text-xs text-red-400 text-left">{searchError}</span>}
          </form>

          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl glass-btn-secondary text-xs font-bold uppercase tracking-wider text-gray-300"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const displayTeam = team;
  const leadInfo = displayTeam ? getTeamLeadInfo(displayTeam) : null;
  const currentTeamId = (displayTeam.teamId || "").toUpperCase();

  return (
    <div className="w-full max-w-2xl mx-auto py-10 px-4">
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-red-500/40 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        
        {/* Verification Status Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-950">
            <ShieldCheck className="w-9 h-9 text-emerald-400" />
          </div>

          <div className="px-4 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-xs font-extrabold uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>VALID WEBX EVENT PASS</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            PASS VERIFICATION SUCCESSFUL
          </h2>
          <p className="text-xs text-gray-400">
            Official entry ticket verified for WEBX — Into the Web of Innovation.
          </p>
        </div>

        {/* RE-ASSIGNMENT SMART BANNERS FOR WEB-037 & WEB-038 */}
        {currentTeamId === "WEB-037" && (
          <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl shadow-black/40">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 text-sm font-bold">Scanning for TEAM IP?</strong>
                <span className="text-[11px] text-amber-200/90 leading-relaxed">
                  TEAM IP was officially updated to <strong>WEB-038</strong> to resolve a duplicate team ID.
                </span>
              </div>
            </div>
            <Link
              href="/verify/WEB-038"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shrink-0 transition-colors flex items-center gap-1 shadow-md"
            >
              <span>View TEAM IP Pass</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {currentTeamId === "WEB-038" && (
          <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl shadow-black/40">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 text-sm font-bold">Scanning for CODECRAFTERS?</strong>
                <span className="text-[11px] text-amber-200/90 leading-relaxed">
                  CODECRAFTERS was officially updated to <strong>WEB-039</strong> to resolve duplicate team IDs.
                </span>
              </div>
            </div>
            <Link
              href="/verify/WEB-039"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shrink-0 transition-colors flex items-center gap-1 shadow-md"
            >
              <span>View CODECRAFTERS Pass</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Team Details Summary */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4">
          <div className="flex items-start justify-between border-b border-white/10 pb-4 gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">TEAM NAME</span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">{displayTeam.teamName}</h3>
              {leadInfo && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-red-600 text-[10px] font-black text-white uppercase tracking-wider shadow-sm">
                    ★ TEAM LEAD
                  </span>
                  <span className="text-xs text-white font-bold">{leadInfo.leadName}</span>
                  <span className="text-xs text-red-300 font-mono font-bold">({leadInfo.leadRegNo})</span>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">OFFICIAL ID</span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-red-500 glow-text-red block">
                {displayTeam.teamId}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="w-4 h-4 text-red-400" />
              <span><strong>Date:</strong> 3rd–4th October 2026</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-red-400" />
              <span><strong>Venue:</strong> 8th Block Hall, KARE</span>
            </div>
          </div>
        </div>

        {/* 4 Participants List */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-gray-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-red-400" />
            <span>VERIFIED PARTICIPANTS (4 MEMBERS)</span>
          </span>

          <div className="grid gap-2">
            {displayTeam.members.map((m, idx) => {
              const isLead = idx === leadInfo?.leaderIndex;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isLead
                      ? "bg-red-950/50 border-red-500/70 ring-1 ring-red-500/40 shadow-lg shadow-red-950/40"
                      : "bg-slate-900/80 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full font-extrabold flex items-center justify-center text-[10px] shrink-0 ${
                        isLead ? "bg-red-600 text-white" : "bg-red-600/30 text-red-300"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-white text-sm block font-bold">{m.name}</strong>
                        {isLead && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-[9px] font-black text-white uppercase tracking-wider shadow-sm">
                            TEAM LEAD
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400">{m.department} • Year {m.year} • Sec {m.section}</span>
                    </div>
                  </div>
                  <span className="font-mono text-red-400 font-extrabold px-3 py-1 rounded bg-red-950/80 border border-red-500/30 shrink-0">
                    {m.regNo}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Search Another Pass */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2.5">
          <span className="text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">
            Verify Another Team / Search Pass:
          </span>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Team ID (e.g. WEB-038) or Reg No..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl glass-input text-xs text-white"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 rounded-xl glass-btn-primary text-xs font-bold uppercase disabled:opacity-50"
            >
              {searching ? "..." : "Lookup"}
            </button>
          </form>
          {searchError && <span className="text-xs text-red-400">{searchError}</span>}
        </div>

        {/* Footer Notice & Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-[11px] text-gray-400">
          <span>🔒 Secure Verification Engine • Privacy Protected</span>
          <Link href="/dashboard" className="text-red-400 hover:text-red-300 font-bold underline">
            Go to My Dashboard →
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function PublicVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-xl mx-auto py-20 px-4 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <h3 className="text-xl font-extrabold text-white">VERIFYING EVENT PASS...</h3>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
