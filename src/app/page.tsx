"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Award,
  BookOpen,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Zap,
  Check,
  Trophy,
  Medal,
  Crown,
} from "lucide-react";
import { getCapacityStatus } from "@/lib/db";

export default function LandingPage() {
  const [capacity, setCapacity] = useState({
    maxTeams: 100,
    confirmedTeamsCount: 0,
    occupiedSlots: 0,
    availableSlots: 100,
    isFull: false,
    registrationOpen: true,
  });

  useEffect(() => {
    // Read local cache immediately upon client mount (zero hydration mismatch)
    try {
      const saved = localStorage.getItem("webx_cached_capacity");
      if (saved) {
        setCapacity(JSON.parse(saved));
      }
    } catch (e) {}

    async function loadCapacity() {
      try {
        const data = await getCapacityStatus();
        setCapacity({
          maxTeams: data.maxTeams,
          confirmedTeamsCount: data.confirmedTeamsCount,
          occupiedSlots: data.occupiedSlots,
          availableSlots: data.availableSlots,
          isFull: data.isFull,
          registrationOpen: data.registrationOpen,
        });
        try {
          localStorage.setItem("webx_cached_capacity", JSON.stringify(data));
        } catch (e) {}
      } catch (err) {
        console.error("Error loading capacity:", err);
      }
    }

    loadCapacity();
    const interval = setInterval(loadCapacity, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-16 py-8 text-white select-none">
      
      {/* HERO SECTION */}
      <section className="relative w-full flex flex-col items-center text-center pt-6 pb-12">
        {/* Glow backdrop behind logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[280px] bg-red-600/25 rounded-full blur-[100px] pointer-events-none" />

        {/* CSI Club Tag Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-red-500/40 text-xs sm:text-sm font-semibold tracking-widest text-red-400 uppercase mb-8 shadow-lg shadow-red-950/50">
          <Sparkles className="w-4 h-4 text-red-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Computer Society of India (CSI) Presents</span>
        </div>

        {/* WEBX Title Card PNG - Exact Asset Use */}
        <div className="relative w-full max-w-2xl h-44 sm:h-56 md:h-64 mb-4 filter drop-shadow-[0_0_40px_rgba(229,9,20,0.7)] transition-transform hover:scale-105 duration-300 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/WEB-X-title_card_transparent.png"
            alt="WEBX - Into the Web of Innovation Title Card"
            className="w-full h-full object-contain pointer-events-none"
            loading="lazy"
          />
        </div>

        {/* DYNAMIC CAPACITY TRACKER BAR */}
        <div className="w-full max-w-xl glass-card rounded-2xl p-6 border border-red-500/30 shadow-2xl mb-8 flex flex-col gap-4">
          <div className="flex items-center justify-between font-bold text-sm sm:text-base">
            <span className="flex items-center gap-2 text-gray-300">
              <Users className="w-5 h-5 text-red-500" />
              TEAM REGISTRATION CAPACITY
            </span>
            <span suppressHydrationWarning className="text-red-400 font-extrabold text-lg tracking-wider glow-text-red">
              {`${capacity.occupiedSlots} / ${capacity.maxTeams} TEAMS`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-4 bg-slate-900/80 rounded-full overflow-hidden p-0.5 border border-white/10 relative">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500 rounded-full transition-all duration-1000 shadow-md shadow-red-600/50"
              style={{ width: `${Math.min(100, (capacity.occupiedSlots / capacity.maxTeams) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>⚡ STRICT 4 MEMBERS / TEAM</span>
            <span>{capacity.availableSlots} SLOTS REMAINING</span>
          </div>
        </div>

        {/* HERO CTA BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          {!capacity.registrationOpen ? (
            <div className="w-full py-4 px-6 rounded-xl glass-panel border border-red-500/60 bg-red-950/70 text-red-300 font-extrabold tracking-wider uppercase text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-red-950/60">
              <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse" />
              <span>REGISTRATIONS CLOSED</span>
            </div>
          ) : capacity.isFull ? (
            <div className="w-full py-4 px-6 rounded-xl glass-panel border border-red-500/60 bg-red-950/70 text-red-300 font-extrabold tracking-wider uppercase text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-red-950/60">
              <ShieldAlert className="w-6 h-6 text-red-400" />
              <span>REGISTRATIONS FULL</span>
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl glass-btn-primary font-extrabold tracking-widest text-lg uppercase flex items-center justify-center gap-3 shadow-xl shadow-red-900/60"
            >
              <span>ENTER THE WEB</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>

      {/* HIGHLIGHT STATS GRID */}
      <section className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "EVENT DATE", value: "3rd–4th October", icon: Calendar, color: "text-red-500" },
          { label: "PRIZE POOL", value: "₹15,000", icon: Award, color: "text-amber-400" },
          { label: "ENTRY FEE", value: "₹350 / Person", sub: "₹1,400 / Team", icon: Zap, color: "text-cyan-400" },
          { label: "ACADEMIC CREDIT", value: "2EE Credits", icon: CheckCircle2, color: "text-emerald-400" },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col gap-2">
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">{stat.label}</span>
            <span className="text-lg sm:text-xl font-extrabold text-white">{stat.value}</span>
            {stat.sub && <span className="text-xs text-gray-400 font-medium">{stat.sub}</span>}
          </div>
        ))}
      </section>

      {/* EVENT DETAILS SECTION */}
      <section id="event-info" className="w-full flex flex-col gap-8 pt-8">
        <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">COMPLETE HACKATHON BREAKDOWN</span>
          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-wider">EVENT SPECIFICATIONS</h3>
          <p className="text-gray-400 text-sm">
            Everything you need to know about WEBX — Into the Web of Innovation.
          </p>
        </div>

        {/* 24-HR HACKATHON VS 65-HR LEARNING CLEAR DISTINCTION CARDS */}
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Card 1: 24-Hour Hackathon */}
          <div className="glass-card rounded-3xl p-8 border border-red-500/40 relative overflow-hidden flex flex-col justify-between gap-6 shadow-2xl">
            <div className="absolute top-0 right-0 px-6 py-2 bg-gradient-to-l from-red-600 to-red-800 rounded-bl-2xl text-xs font-extrabold uppercase tracking-widest text-white">
              CORE COMPETITION
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/50 flex items-center justify-center">
                <Clock className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="text-2xl font-extrabold text-white">24-HOUR HACKATHON</h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                An intense 24-hour non-stop hackathon sprint at <strong>8th Block Seminar Hall</strong>. Teams of 4 build full-stack web innovation prototypes to compete for the <strong>₹15,000 Prize Pool</strong> and academic accolades.
              </p>
            </div>

            <ul className="flex flex-col gap-2.5 text-sm text-gray-300">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-red-500" />
                <span><strong>Duration:</strong> 24 Hours Non-Stop</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-red-500" />
                <span><strong>Venue:</strong> 8th Block Seminar Hall</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-red-500" />
                <span><strong>Team Requirement:</strong> Strictly 4 Members</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-red-500" />
                <span><strong>Entry Fee:</strong> ₹350 per member (₹1,400 per team)</span>
              </li>
            </ul>
          </div>

          {/* Card 2: 65-Hour Learning Experience */}
          <div className="glass-card rounded-3xl p-8 border border-cyan-500/30 relative overflow-hidden flex flex-col justify-between gap-6 shadow-2xl">
            <div className="absolute top-0 right-0 px-6 py-2 bg-gradient-to-l from-cyan-600 to-blue-800 rounded-bl-2xl text-xs font-extrabold uppercase tracking-widest text-white">
              ACADEMIC CERTIFICATION
            </div>

            <div className="flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-600/20 border border-cyan-500/50 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-cyan-400" />
              </div>
              <h4 className="text-2xl font-extrabold text-white">65-HOUR LEARNING EXPERIENCE</h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                A comprehensive skill enhancement program incorporating a <strong>40-Hour Guided Course</strong>, hands-on web technology modules, interactive quizzes, and project evaluation leading to <strong>2EE Academic Credits</strong>.
              </p>
            </div>

            <ul className="flex flex-col gap-2.5 text-sm text-gray-300">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-cyan-400" />
                <span><strong>Total Scope:</strong> 65 Hours Total Learning Experience</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-cyan-400" />
                <span><strong>Course Module:</strong> 40-Hour Structured Course + Quiz</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-cyan-400" />
                <span><strong>Credits Earned:</strong> Official 2EE Academic Credits</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-cyan-400" />
                <span><strong>Eligibility:</strong> All registered participants</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* OLYMPIC RANKING PRIZE POOL PODIUM */}
      <section className="w-full flex flex-col items-center gap-8 py-4 relative overflow-hidden">
        {/* Glow backdrop behind podium */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-yellow-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto flex flex-col items-center gap-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-xs font-extrabold uppercase tracking-widest text-yellow-400 shadow-lg shadow-yellow-950/40">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>₹15,000 TOTAL CASH PRIZE POOL</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-wider text-white">
            PRIZE POOL
          </h3>
          <p className="text-gray-400 text-xs sm:text-sm max-w-md">
            Outperform, innovate, and conquer the web to claim the ultimate championship glory and rewards.
          </p>
        </div>

        {/* Olympic Podium Platform Container */}
        <div className="w-full max-w-3xl flex flex-col items-center relative z-10 pt-6">
          <div className="w-full flex items-end justify-center gap-2.5 sm:gap-4 md:gap-6 px-1 sm:px-4">
            
            {/* 2ND PLACE (SILVER) - LEFT BAR */}
            <div className="flex-1 flex flex-col items-center group">
              {/* Prize card above podium */}
              <div className="flex flex-col items-center text-center mb-3 sm:mb-4 transition-transform group-hover:-translate-y-1 duration-300">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 p-0.5 shadow-xl shadow-slate-400/20 mb-2">
                  <div className="w-full h-full rounded-[14px] bg-slate-950/90 flex items-center justify-center">
                    <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-slate-200" />
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs font-extrabold tracking-widest text-slate-300 uppercase">
                  2ND PLACE
                </span>
                <span className="text-xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 mt-0.5">
                  ₹5,000
                </span>
              </div>

              {/* Podium Bar 2 (Silver) */}
              <div className="w-full h-44 sm:h-56 md:h-64 rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-slate-400/30 via-slate-700/20 to-slate-950/90 border-t-2 border-x border-slate-300/50 flex flex-col items-center justify-between p-3 sm:p-5 relative shadow-[0_0_35px_rgba(203,213,225,0.15)] overflow-hidden backdrop-blur-md">
                {/* Metallic Top Sheen */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                  RUNNER UP
                </span>
                
                {/* Big Olympic Rank Number */}
                <span className="text-6xl sm:text-8xl md:text-9xl font-black text-slate-400/30 font-mono select-none my-auto">
                  2
                </span>
              </div>
            </div>

            {/* 1ST PLACE (GOLD) - CENTER BAR (TALLEST) */}
            <div className="flex-1 flex flex-col items-center group -mt-6 sm:-mt-10">
              {/* Prize card above podium */}
              <div className="flex flex-col items-center text-center mb-3 sm:mb-4 transition-transform group-hover:-translate-y-2 duration-300">
                {/* Floating Crown / Trophy with radiant gold glow */}
                <div className="relative mb-2">
                  <div className="absolute -inset-2 bg-yellow-400/40 rounded-full blur-md animate-pulse" />
                  <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 p-0.5 shadow-2xl shadow-yellow-500/40">
                    <div className="w-full h-full rounded-[14px] bg-slate-950/90 flex items-center justify-center">
                      <Trophy className="w-7 h-7 sm:w-10 sm:h-10 text-yellow-400 animate-bounce" style={{ animationDuration: '3s' }} />
                    </div>
                  </div>
                </div>
                
                <span className="text-[10px] sm:text-xs font-black tracking-widest text-amber-400 uppercase flex items-center gap-1">
                  <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400" />
                  CHAMPION
                </span>
                <span className="text-2xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500 filter drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] mt-0.5">
                  ₹7,000
                </span>
              </div>

              {/* Podium Bar 1 (Gold - Highest) */}
              <div className="w-full h-56 sm:h-72 md:h-80 rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-yellow-500/40 via-amber-900/30 to-slate-950/95 border-t-2 border-x-2 border-yellow-400/80 flex flex-col items-center justify-between p-3 sm:p-5 relative shadow-[0_0_55px_rgba(234,179,8,0.25)] overflow-hidden backdrop-blur-md">
                {/* Golden Top Sheen */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-yellow-200 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent pointer-events-none" />

                <span className="text-[10px] sm:text-xs font-extrabold text-yellow-400 uppercase tracking-widest">
                  1ST WINNER
                </span>

                {/* Big Olympic Rank Number */}
                <span className="text-7xl sm:text-9xl md:text-[11rem] font-black text-yellow-400/40 font-mono select-none my-auto">
                  1
                </span>
              </div>
            </div>

            {/* 3RD PLACE (BRONZE) - RIGHT BAR */}
            <div className="flex-1 flex flex-col items-center group">
              {/* Prize card above podium */}
              <div className="flex flex-col items-center text-center mb-3 sm:mb-4 transition-transform group-hover:-translate-y-1 duration-300">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-500 to-amber-800 p-0.5 shadow-xl shadow-orange-700/20 mb-2">
                  <div className="w-full h-full rounded-[14px] bg-slate-950/90 flex items-center justify-center">
                    <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs font-extrabold tracking-widest text-amber-500 uppercase">
                  3RD PLACE
                </span>
                <span className="text-xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-400 to-amber-600 mt-0.5">
                  ₹3,000
                </span>
              </div>

              {/* Podium Bar 3 (Bronze) */}
              <div className="w-full h-36 sm:h-44 md:h-52 rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-amber-700/30 via-orange-950/20 to-slate-950/90 border-t-2 border-x border-amber-600/50 flex flex-col items-center justify-between p-3 sm:p-5 relative shadow-[0_0_35px_rgba(217,119,6,0.15)] overflow-hidden backdrop-blur-md">
                {/* Bronze Top Sheen */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
                
                <span className="text-[10px] sm:text-xs font-bold text-amber-500 uppercase tracking-widest">
                  2ND RUNNER UP
                </span>

                {/* Big Olympic Rank Number */}
                <span className="text-6xl sm:text-8xl md:text-9xl font-black text-amber-500/30 font-mono select-none my-auto">
                  3
                </span>
              </div>
            </div>

          </div>

          {/* Olympic Podium Ground Stage / Base Plate */}
          <div className="w-full h-3 rounded-full bg-gradient-to-r from-slate-800 via-white/20 to-slate-800 shadow-xl" />
        </div>
      </section>

      {/* ELIGIBILITY & RULES SUMMARY */}
      <section className="w-full glass-panel rounded-3xl p-8 border border-white/10 flex flex-col gap-6">
        <h4 className="text-xl font-bold tracking-wider text-white flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <span>REGISTRATION & PARTICIPATION RULES</span>
        </h4>
        <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-300">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
            <span className="font-bold text-red-400 uppercase text-xs">Rule 1: Domain Restriction</span>
            <p>Only official KLU student emails ending with <code className="text-white bg-black/50 px-2 py-0.5 rounded border border-white/10">@klu.ac.in</code> are authorized to register.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
            <span className="font-bold text-red-400 uppercase text-xs">Rule 2: Strictly 4 Members</span>
            <p>Every team must register exactly 4 members. Partial team entries or individual entries will not be accepted.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
            <span className="font-bold text-red-400 uppercase text-xs">Rule 3: 5-Min Payment Slot</span>
            <p>Upon starting registration, a 5-minute temporary seat reservation is locked while payment verification is completed.</p>
          </div>
        </div>
      </section>

      {/* FINAL BOTTOM CALL TO ACTION */}
      <section className="w-full glass-card rounded-3xl p-10 border border-red-500/40 text-center flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/40 via-transparent to-red-950/40 pointer-events-none" />
        
        <h3 className="text-2xl sm:text-4xl font-extrabold tracking-wider">
          READY TO ENTER THE WEB OF INNOVATION?
        </h3>
        <p className="text-gray-300 max-w-xl text-sm sm:text-base">
          Slots are strictly limited to {capacity.maxTeams} teams. Secure your team slot now and step into WEBX 2026.
        </p>

        {!capacity.registrationOpen ? (
          <div className="px-8 py-4 rounded-xl glass-panel border border-red-500/60 bg-red-950/70 text-red-300 font-extrabold text-base uppercase tracking-wider flex items-center gap-2.5 shadow-xl shadow-red-950/50">
            <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
            <span>REGISTRATIONS ARE CURRENTLY CLOSED</span>
          </div>
        ) : capacity.isFull ? (
          <div className="px-8 py-4 rounded-xl glass-panel border border-red-500/60 bg-red-950/70 text-red-300 font-extrabold text-base uppercase tracking-wider flex items-center gap-2.5 shadow-xl shadow-red-950/50">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>REGISTRATIONS FULL</span>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-10 py-4 rounded-xl glass-btn-primary font-extrabold text-lg uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-red-900/80"
          >
            <span>TEAM LEAD LOGIN & REGISTER</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        )}
      </section>

    </div>
  );
}
