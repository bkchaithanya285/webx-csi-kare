"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Lock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  Check,
  Building,
  Mail,
  Phone,
  User,
  Home,
  Info,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { Student, TeamData, updateTeamDetails } from "@/lib/db";
import { getTeamLeadInfo } from "@/lib/teamUtils";

const DEPARTMENTS = ["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL", "BIO", "Others"];
const YEARS = ["II", "III", "IV", "I"];
const BOYS_HOSTELS = ["MH-1", "MH-2", "MH-3", "MH-4", "MH-5", "MH-6", "MH-7"];
const GIRLS_HOSTELS = ["LH-1", "LH-2", "LH-3", "LH-4"];

interface TeamLeadEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamData;
  onSuccess: (updatedTeam: TeamData) => void;
}

export function TeamLeadEditModal({
  isOpen,
  onClose,
  team,
  onSuccess,
}: TeamLeadEditModalProps) {
  const leadInfo = getTeamLeadInfo(team);
  const [members, setMembers] = useState<Student[]>(() => {
    return (team.members || []).map((m) => ({ ...m }));
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (team.members) {
      setMembers(team.members.map((m) => ({ ...m })));
    }
  }, [team]);

  if (!isOpen) return null;

  const handleUpdateMember = (index: number, field: keyof Student, value: any) => {
    setError("");
    setMembers((prev) => {
      const copy = [...prev];
      const m = { ...copy[index], [field]: value };

      // Strictly uppercase block letters for names
      if (field === "name") {
        m.name = String(value)
          .toUpperCase()
          .replace(/[^A-Z\s.]/g, "")
          .replace(/\s{2,}/g, " ")
          .replace(/^\s+/, "");
      }

      // Strictly uppercase block letters for section
      if (field === "section") {
        m.section = String(value).toUpperCase().replace(/[^A-Z0-9\s-]/g, "").trim();
      }

      // Strictly uppercase block letters for room
      if (field === "roomNo") {
        m.roomNo = String(value).toUpperCase().trim();
      }

      // Automatically remove room number and hostel when updating from Hosteller to Day Scholar
      if (field === "accommodation") {
        m.accommodation = value;
        if (value === "Day Scholar") {
          m.roomNo = "";
          m.hostel = "";
        }
      }

      copy[index] = m;
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation: All 4 members must have complete details
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.name || !m.name.trim()) {
        setError(`Member ${i + 1}: Name is required.`);
        return;
      }
      if (!m.email || !m.email.trim()) {
        setError(`Member ${i + 1}: University email is required.`);
        return;
      }
      if (!m.email.trim().toLowerCase().endsWith("@klu.ac.in")) {
        setError(`Member ${i + 1}: Email must be a valid @klu.ac.in college email.`);
        return;
      }
      if (!m.mobile || !m.mobile.trim()) {
        setError(`Member ${i + 1}: Mobile number is required.`);
        return;
      }
      if (m.accommodation === "Hosteller" && !m.hostel) {
        setError(`Member ${i + 1}: Please select a Hostel for hosteller.`);
        return;
      }
    }

    setSaving(true);
    try {
      // Strictly sanitize block letters
      const sanitizedMembers: Student[] = members.map((m, idx) => ({
        ...m,
        name: (m.name || "")
          .toUpperCase()
          .replace(/[^A-Z\s.]/g, "")
          .replace(/\s{2,}/g, " ")
          .trim(),
        regNo: (team.members[idx]?.regNo || m.regNo || "").trim().toUpperCase(), // strictly immutable
        section: (m.section || "").toUpperCase().trim(),
        department: (m.department || "CSE").trim(),
        year: (m.year || "II").trim(),
        email: (m.email || "").trim().toLowerCase(),
        mobile: (m.mobile || "").trim(),
        gender: (m.gender || "Male").trim(),
        accommodation: m.accommodation === "Hosteller" ? "Hosteller" : "Day Scholar",
        hostel: m.accommodation === "Hosteller" ? (m.hostel || "").trim() : "",
        roomNo: m.accommodation === "Hosteller" ? (m.roomNo || "").toUpperCase().trim() : "",
      }));

      const newLead = sanitizedMembers[leadInfo.leaderIndex] || sanitizedMembers[0];

      const updates: Partial<TeamData> = {
        members: sanitizedMembers,
        leadName: newLead?.name || team.leadName,
        leadEmail: newLead?.email || team.leadEmail,
        hasEditedDetails: true,
        editedAt: new Date().toISOString(),
      };

      const teamIdToUpdate = team.id || team.teamId || team.leadEmail;
      const res = await updateTeamDetails(teamIdToUpdate, updates);

      if (!res.success) {
        setError(res.message || "Failed to update team details. Please try again.");
        setSaving(false);
        return;
      }

      const updatedTeamData: TeamData = {
        ...team,
        ...updates,
      };

      setSuccess("Team details successfully saved! Your live pass is updated.");
      setTimeout(() => {
        onSuccess(updatedTeamData);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Team lead edit error:", err);
      setError(err?.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950/95 border border-red-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-white/5 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500/50 text-[10px] font-black uppercase tracking-widest text-red-400">
                TEAM LEAD PORTAL
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-500/50 text-[10px] font-black uppercase tracking-wider text-amber-300">
                ONE-TIME EDIT ONLY
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              UPDATE TEAM DETAILS
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Review and update your team members&apos; details. Once saved, these details will be permanently locked for the event.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          
          {/* Important Security Notice Banner */}
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-3 shadow-lg">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="block text-amber-300 font-bold mb-0.5">
                Fixed & Locked Fields Notice
              </strong>
              <span>
                To preserve verified registration and payment records, <strong>Team Name</strong>, <strong>Team ID</strong>, <strong>UTR Number</strong>, <strong>Payment Screenshot</strong>, and student <strong>Registration Numbers</strong> cannot be changed. All other member fields (Names in block letters, emails, mobile, department, year, section, accommodation) can be updated once.
              </span>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-semibold flex items-start gap-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-3 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-6">
            
            {/* 1. Locked Team & Payment Information Bar */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Team Name (Locked)</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-gray-200 font-bold tracking-wide truncate" title={team.teamName}>
                  {team.teamName}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Team ID (Locked)</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-red-400 font-black font-mono truncate">
                  {team.teamId || "N/A"}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>UTR / Ref No (Locked)</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-emerald-400 font-mono font-bold truncate" title={team.utrNumber}>
                  {team.utrNumber || "N/A"}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Screenshot Proof (Locked)</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between min-h-[38px]">
                  {team.paymentScreenshotUrl ? (
                    <a
                      href={team.paymentScreenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline truncate"
                      title="View payment screenshot in new tab"
                    >
                      <Receipt className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">View Proof</span>
                      <ExternalLink className="w-3 h-3 text-cyan-400/80 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-gray-500 italic">No proof attached</span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-amber-400 uppercase font-bold tracking-wider shrink-0 ml-1.5">
                    Locked
                  </span>
                </div>
              </div>
            </div>

            {/* 2. 4 Member Editable Cards */}
            <div className="flex flex-col gap-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-400" />
                <span>EDIT 4 MEMBERS DETAILS (BLOCK LETTERS ONLY)</span>
              </span>

              <div className="grid gap-4">
                {members.map((m, idx) => {
                  const isLead = idx === leadInfo.leaderIndex;
                  return (
                    <div
                      key={idx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isLead
                          ? "bg-rose-950/25 border-rose-500/60 ring-1 ring-rose-500/30"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      {/* Member Card Header */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shadow ${
                              isLead ? "bg-rose-600 text-white" : "bg-white/10 text-gray-300"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <strong className="text-white text-sm">
                            Participant {idx + 1}
                          </strong>
                          {isLead && (
                            <span className="px-2 py-0.5 rounded bg-rose-600 text-[10px] font-black text-white uppercase tracking-wider shadow">
                              TEAM LEAD
                            </span>
                          )}
                        </div>

                        {/* Registration Number Badge (Strictly Locked) */}
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-white/10">
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-[10px] text-gray-400 uppercase font-mono">REG NO:</span>
                          <span className="text-xs font-mono font-black text-red-400">{m.regNo}</span>
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        
                        {/* Name (Block letters only) */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-300 uppercase">
                            Full Name (BLOCK LETTERS) <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. ARUN KUMAR"
                            value={m.name}
                            onChange={(e) => handleUpdateMember(idx, "name", e.target.value)}
                            style={{ textTransform: "uppercase" }}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white uppercase font-bold"
                          />
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-300 uppercase">
                            University Email (@klu.ac.in) <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. 2300030123@klu.ac.in"
                            value={m.email}
                            onChange={(e) => handleUpdateMember(idx, "email", e.target.value.toLowerCase().trim())}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white font-mono"
                          />
                        </div>

                        {/* Mobile */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-300 uppercase">
                            Mobile Number <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="10-digit mobile"
                            value={m.mobile}
                            onChange={(e) => handleUpdateMember(idx, "mobile", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white font-mono"
                          />
                        </div>

                        {/* Department */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-300 uppercase">
                            Department <span className="text-red-400">*</span>
                          </label>
                          <select
                            value={m.department}
                            onChange={(e) => handleUpdateMember(idx, "department", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900 border border-white/10"
                          >
                            {DEPARTMENTS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>

                        {/* Year & Section (Section in Block Letters) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-gray-300 uppercase">Year</label>
                            <select
                              value={m.year}
                              onChange={(e) => handleUpdateMember(idx, "year", e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl glass-input text-xs text-white bg-slate-900 border border-white/10"
                            >
                              {YEARS.map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-gray-300 uppercase">Section</label>
                            <input
                              type="text"
                              placeholder="e.g. S1"
                              value={m.section}
                              onChange={(e) => handleUpdateMember(idx, "section", e.target.value)}
                              style={{ textTransform: "uppercase" }}
                              className="w-full px-2.5 py-2 rounded-xl glass-input text-xs text-white uppercase font-bold"
                            />
                          </div>
                        </div>

                        {/* Gender */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-300 uppercase">Gender</label>
                          <select
                            value={m.gender}
                            onChange={(e) => handleUpdateMember(idx, "gender", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900 border border-white/10"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Accommodation */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-300 uppercase">Accommodation</label>
                          <select
                            value={m.accommodation}
                            onChange={(e) => handleUpdateMember(idx, "accommodation", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900 border border-white/10"
                          >
                            <option value="Day Scholar">Day Scholar</option>
                            <option value="Hosteller">Hosteller</option>
                          </select>
                        </div>

                        {/* Hosteller Fields */}
                        {m.accommodation === "Hosteller" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold text-gray-300 uppercase">Hostel</label>
                              <select
                                value={m.hostel || (m.gender === "Female" ? GIRLS_HOSTELS[0] : BOYS_HOSTELS[0])}
                                onChange={(e) => handleUpdateMember(idx, "hostel", e.target.value)}
                                className="w-full px-2.5 py-2 rounded-xl glass-input text-xs text-white bg-slate-900 border border-white/10"
                              >
                                {(m.gender === "Female" ? GIRLS_HOSTELS : BOYS_HOSTELS).map((h) => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold text-gray-300 uppercase">Room No</label>
                              <input
                                type="text"
                                placeholder="e.g. 204"
                                value={m.roomNo || ""}
                                onChange={(e) => handleUpdateMember(idx, "roomNo", e.target.value)}
                                style={{ textTransform: "uppercase" }}
                                className="w-full px-2.5 py-2 rounded-xl glass-input text-xs text-white uppercase font-bold"
                              />
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Action Bar */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-300">
                <span className="block font-bold text-white">Save Updated Details</span>
                <span className="text-[11px] text-amber-300">
                  This is your one-time edit. After saving, details will be permanently locked.
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold uppercase transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-950 hover:scale-105 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving Updates..." : "Save Details (One-Time Lock)"}</span>
                </button>
              </div>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
