"use client";

import React, { useState } from "react";
import { PieChart, Users, GraduationCap, Building2, Home, Sparkles } from "lucide-react";
import { TeamData, Student } from "@/lib/db";

interface ChartSlice {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface DonutCardProps {
  title: string;
  icon: React.ReactNode;
  slices: ChartSlice[];
  total: number;
  accentColor: string;
}

const COLOR_PALETTES = {
  year: ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
  gender: ["#3b82f6", "#ec4899", "#8b5cf6", "#10b981"],
  dept: [
    "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
    "#06b6d4", "#f97316", "#14b8a6", "#6366f1", "#d946ef",
  ],
  accomm: ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"],
};

function DonutCard({ title, icon, slices, total, accentColor }: DonutCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const radius = 38;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="glass-card rounded-3xl p-5 border border-white/10 hover:border-red-500/30 transition-all shadow-xl flex flex-col justify-between bg-slate-950/80">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${accentColor}`}>
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white tracking-wide">{title}</h4>
            <span className="text-[10px] text-gray-400 font-mono uppercase">
              {total} Total Participants
            </span>
          </div>
        </div>
      </div>

      {/* Donut Graphic & Center Stat */}
      <div className="flex items-center justify-center my-4 relative">
        <svg width="150" height="150" viewBox="0 0 100 100" className="rotate-[-90deg] overflow-visible">
          {/* Background circle track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            slices.map((slice, idx) => {
              const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += slice.percentage;

              const isHovered = hoveredIndex === idx;

              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${slice.color})` : "none",
                  }}
                />
              );
            })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {hoveredIndex !== null && slices[hoveredIndex] ? (
            <>
              <span className="text-lg font-black text-white font-mono leading-tight">
                {slices[hoveredIndex].percentage}%
              </span>
              <span
                className="text-[9px] font-bold uppercase truncate max-w-[80px]"
                style={{ color: slices[hoveredIndex].color }}
              >
                {slices[hoveredIndex].label}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {slices[hoveredIndex].count} pax
              </span>
            </>
          ) : (
            <>
              <span className="text-xl font-black text-white font-mono leading-tight">
                {total}
              </span>
              <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">
                Students
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend / Breakdown List */}
      <div className="flex flex-col gap-1.5 pt-3 border-t border-white/10 max-h-40 overflow-y-auto pr-1 text-xs">
        {slices.length === 0 ? (
          <span className="text-[11px] text-gray-500 text-center py-2">No data yet</span>
        ) : (
          slices.map((slice, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                  isHovered ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className={`text-xs font-semibold truncate ${isHovered ? "text-white" : "text-gray-300"}`}>
                    {slice.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className="text-white font-bold">{slice.count}</span>
                  <span className="text-gray-400 text-[10px] w-9 text-right">
                    ({slice.percentage}%)
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

interface AdminAnalyticsChartsProps {
  teams: TeamData[];
}

export function AdminAnalyticsCharts({ teams }: AdminAnalyticsChartsProps) {
  const [showCharts, setShowCharts] = useState(true);

  // Extract all confirmed/registered members
  const allMembers: Student[] = [];
  teams.forEach((t) => {
    if (t.members && Array.isArray(t.members)) {
      t.members.forEach((m) => {
        if (m && m.name) allMembers.push(m);
      });
    }
  });

  const totalMembers = allMembers.length;

  // 1. Year Distribution
  const yearCounts: Record<string, number> = {};
  allMembers.forEach((m) => {
    let y = (m.year || "Unknown").trim().toUpperCase();
    if (y === "1" || y === "I") y = "Year I";
    else if (y === "2" || y === "II") y = "Year II";
    else if (y === "3" || y === "III") y = "Year III";
    else if (y === "4" || y === "IV") y = "Year IV";
    yearCounts[y] = (yearCounts[y] || 0) + 1;
  });

  const yearOrder = ["Year I", "Year II", "Year III", "Year IV"];
  const yearSlices: ChartSlice[] = Object.entries(yearCounts)
    .sort(([a], [b]) => {
      const idxA = yearOrder.indexOf(a);
      const idxB = yearOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(([label, count], idx) => ({
      label,
      count,
      percentage: totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0,
      color: COLOR_PALETTES.year[idx % COLOR_PALETTES.year.length],
    }));

  // 2. Gender Distribution
  const genderCounts: Record<string, number> = {};
  allMembers.forEach((m) => {
    let g = (m.gender || "Not Specified").trim();
    if (g.toLowerCase() === "male") g = "Male";
    else if (g.toLowerCase() === "female") g = "Female";
    else if (g.toLowerCase() === "other") g = "Other";
    genderCounts[g] = (genderCounts[g] || 0) + 1;
  });

  const genderSlices: ChartSlice[] = Object.entries(genderCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count], idx) => ({
      label,
      count,
      percentage: totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0,
      color: COLOR_PALETTES.gender[idx % COLOR_PALETTES.gender.length],
    }));

  // 3. Department Distribution
  const deptCounts: Record<string, number> = {};
  allMembers.forEach((m) => {
    const d = (m.department || "Unknown").trim().toUpperCase() || "UNKNOWN";
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });

  const deptSlices: ChartSlice[] = Object.entries(deptCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count], idx) => ({
      label,
      count,
      percentage: totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0,
      color: COLOR_PALETTES.dept[idx % COLOR_PALETTES.dept.length],
    }));

  // 4. Accommodation Distribution
  const accommCounts: Record<string, number> = {};
  allMembers.forEach((m) => {
    const a = (m.accommodation || "Unknown").trim();
    const formatted = a.toLowerCase().includes("hostel")
      ? "Hosteller"
      : a.toLowerCase().includes("day")
      ? "Day Scholar"
      : a;
    accommCounts[formatted] = (accommCounts[formatted] || 0) + 1;
  });

  const accommSlices: ChartSlice[] = Object.entries(accommCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count], idx) => ({
      label,
      count,
      percentage: totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0,
      color: COLOR_PALETTES.accomm[idx % COLOR_PALETTES.accomm.length],
    }));

  return (
    <div className="flex flex-col gap-4">
      {/* Analytics Section Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
            Registration Demographics Analytics
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-mono text-red-400 font-bold">
            {totalMembers} PARTICIPANTS ({teams.length} TEAMS)
          </span>
        </div>

        <button
          onClick={() => setShowCharts(!showCharts)}
          className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-bold uppercase text-gray-300 hover:text-white transition-colors"
        >
          {showCharts ? "Hide Charts ▲" : "Show Charts ▼"}
        </button>
      </div>

      {/* 4 Demographics Donut/Pie Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <DonutCard
            title="Year Distribution"
            icon={<GraduationCap className="w-4 h-4" />}
            slices={yearSlices}
            total={totalMembers}
            accentColor="text-amber-400"
          />

          <DonutCard
            title="Gender Distribution"
            icon={<Users className="w-4 h-4" />}
            slices={genderSlices}
            total={totalMembers}
            accentColor="text-pink-400"
          />

          <DonutCard
            title="Department Distribution"
            icon={<Building2 className="w-4 h-4" />}
            slices={deptSlices}
            total={totalMembers}
            accentColor="text-cyan-400"
          />

          <DonutCard
            title="Accommodation"
            icon={<Home className="w-4 h-4" />}
            slices={accommSlices}
            total={totalMembers}
            accentColor="text-emerald-400"
          />
        </div>
      )}
    </div>
  );
}
