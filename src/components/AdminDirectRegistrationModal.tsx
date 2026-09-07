"use client";

import React, { useState } from "react";
import {
  X,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Check,
  CreditCard,
  Building,
  Mail,
  Phone,
  User,
  Home,
  ExternalLink,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { Student, TeamData, adminCreateTeamRegistration } from "@/lib/db";
import { uploadToCloudinary, compressImageToDataUrl } from "@/lib/cloudinary";

const DEPARTMENTS = ["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL", "BIO", "Others"];
const YEARS = ["II", "III", "IV", "I"];
const BOYS_HOSTELS = ["MH-1", "MH-2", "MH-3", "MH-4", "MH-5", "MH-6", "MH-7"];
const GIRLS_HOSTELS = ["LH-1", "LH-2", "LH-3", "LH-4"];

interface AdminDirectRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTeam: TeamData) => void;
  existingTeams?: TeamData[];
}

const emptyMember = (): Student => ({
  name: "",
  regNo: "",
  department: "CSE",
  year: "II",
  section: "",
  mobile: "",
  gender: "Male",
  accommodation: "Day Scholar",
  email: "",
  hostel: "",
  roomNo: "",
});

export function AdminDirectRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  existingTeams = [],
}: AdminDirectRegistrationModalProps) {
  const [teamName, setTeamName] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"VERIFIED" | "PENDING">("VERIFIED");
  const [utrNumber, setUtrNumber] = useState(() => `ADMIN-OFFLINE-${Math.floor(100000 + Math.random() * 900000)}`);
  const [leadIndex, setLeadIndex] = useState(0);
  const [members, setMembers] = useState<Student[]>([
    emptyMember(),
    emptyMember(),
    emptyMember(),
    emptyMember(),
  ]);

  // Payment Screenshot State
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploadedScreenshotUrl, setUploadedScreenshotUrl] = useState<string>("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotProgress, setScreenshotProgress] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdTeam, setCreatedTeam] = useState<TeamData | null>(null);

  if (!isOpen) return null;

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    setScreenshotFile(file);
    setUploadingScreenshot(true);
    setScreenshotProgress(25);
    setError("");

    try {
      const compressed = await compressImageToDataUrl(file);
      if (compressed) {
        setScreenshotPreview(compressed);
        setUploadedScreenshotUrl(compressed); // Instant safety fallback
        setScreenshotProgress(50);
      }

      const teamIdentifier = teamName ? teamName.replace(/\s+/g, "_") : "ADMIN_DIRECT";
      const cldUrl = await uploadToCloudinary({
        file,
        teamId: teamIdentifier,
        onProgress: (pct) => setScreenshotProgress(Math.max(50, pct)),
      });

      if (cldUrl) {
        setUploadedScreenshotUrl(cldUrl);
      }
      setScreenshotProgress(100);
    } catch (err: any) {
      console.warn("Cloudinary upload fallback to compressed data:", err);
      setScreenshotProgress(100);
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleClearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setUploadedScreenshotUrl("");
    setScreenshotProgress(0);
  };

  const handleUpdateMember = (index: number, field: keyof Student, value: any) => {
    setError("");
    setMembers((prev) => {
      const copy = [...prev];
      const m = { ...copy[index], [field]: value };

      if (field === "name") {
        m.name = String(value)
          .toUpperCase()
          .replace(/[^A-Z\s.]/g, "")
          .replace(/\s{2,}/g, " ")
          .replace(/^\s+/, "");
      }

      // Auto-fill university email when regNo is entered
      if (field === "regNo") {
        const cleanReg = String(value).trim().toUpperCase();
        m.regNo = cleanReg;
        // If email was empty or previously matching a regNo@klu.ac.in pattern, auto-update it
        if (!m.email || m.email.endsWith("@klu.ac.in")) {
          m.email = cleanReg ? `${cleanReg.toLowerCase()}@klu.ac.in` : "";
        }
      }

      if (field === "section") {
        m.section = String(value).toUpperCase().replace(/[^A-Z0-9\s-]/g, "").trim();
      }

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

  const handleResetForm = () => {
    setTeamName("");
    setPaymentStatus("VERIFIED");
    setUtrNumber(`ADMIN-OFFLINE-${Math.floor(100000 + Math.random() * 900000)}`);
    setLeadIndex(0);
    setMembers([emptyMember(), emptyMember(), emptyMember(), emptyMember()]);
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setUploadedScreenshotUrl("");
    setScreenshotProgress(0);
    setError("");
    setCreatedTeam(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanTeam = teamName.trim().toUpperCase();
    if (!cleanTeam || cleanTeam.length < 2) {
      setError("Please enter a valid Team Name (minimum 2 characters).");
      return;
    }

    // Check if team name exists in existingTeams
    if (existingTeams.some((t) => t.teamName?.trim().toUpperCase() === cleanTeam)) {
      setError(`Team Name "${cleanTeam}" is already registered. Please choose another.`);
      return;
    }

    // Validate each member
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.name || !m.name.trim()) {
        setError(`Member ${i + 1}: Name is required.`);
        return;
      }
      if (!m.regNo || !m.regNo.trim()) {
        setError(`Member ${i + 1}: Registration Number is required.`);
        return;
      }
      if (!m.email || !m.email.trim()) {
        setError(`Member ${i + 1}: University Email is required.`);
        return;
      }
      if (!m.email.trim().toLowerCase().endsWith("@klu.ac.in")) {
        setError(
          `Member ${i + 1}: Email must be a valid @klu.ac.in account for participant Google login to work.`
        );
        return;
      }
      if (!m.mobile || !m.mobile.trim()) {
        setError(`Member ${i + 1}: Mobile Number is required.`);
        return;
      }
      if (m.accommodation === "Hosteller" && !m.hostel) {
        setError(`Member ${i + 1}: Please select a Hostel for hosteller.`);
        return;
      }
    }

    if (!uploadedScreenshotUrl) {
      setError("Payment Screenshot is required. Please upload the payment confirmation / receipt image.");
      return;
    }

    setLoading(true);
    try {
      const res = await adminCreateTeamRegistration({
        teamName: cleanTeam,
        leadIndex,
        members,
        paymentStatus,
        utrNumber,
        paymentScreenshotUrl: uploadedScreenshotUrl,
      });

      if (!res.success || !res.newTeam) {
        setError(res.message || "Failed to create registration.");
        setLoading(false);
        return;
      }

      setCreatedTeam(res.newTeam);
      onSuccess(res.newTeam);
    } catch (err: any) {
      console.error("Admin registration error:", err);
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950/95 border border-red-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-white/5 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500/50 text-[10px] font-black uppercase tracking-widest text-red-400">
                ADMIN DIRECT ENTRY
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                GOOGLE LOGIN PASS READY
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              {createdTeam ? "REGISTRATION CONFIRMED" : "DIRECT TEAM REGISTRATION"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {createdTeam
                ? "The team is officially registered and active in the database."
                : "Enter full registration details. All 4 members can log in directly with their @klu.ac.in Google account to access their passes."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {createdTeam ? (
            /* SUCCESS VIEW */
            <div className="flex flex-col items-center justify-center text-center py-6 gap-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/50">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  OFFICIAL REGISTRATION SUCCESSFUL
                </span>
                <h3 className="text-3xl font-black text-white mt-1">{createdTeam.teamName}</h3>
                <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-red-950/80 border border-red-500/50">
                  <span className="text-xs font-mono font-bold text-gray-300">ASSIGNED TEAM ID:</span>
                  <span className="text-xl font-black font-mono text-red-400 glow-text-red">
                    {createdTeam.teamId}
                  </span>
                </div>
              </div>

              {/* Teammates Summary Banner */}
              <div className="w-full max-w-xl p-4 rounded-2xl bg-white/5 border border-white/10 text-left flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-extrabold uppercase text-gray-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-red-400" />
                    <span>Registered Teammates ({createdTeam.members?.length})</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold uppercase">
                    Status: {createdTeam.paymentStatus}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  {createdTeam.members?.map((m, idx) => {
                    const isLead = idx === createdTeam.leaderIndex;
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col gap-0.5 ${
                          isLead
                            ? "bg-rose-950/40 border-rose-500/60"
                            : "bg-slate-900/60 border-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-white truncate">
                            {idx + 1}. {m.name}
                          </strong>
                          {isLead && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-[9px] font-black text-white uppercase">
                              LEAD
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-red-400 text-[11px]">{m.regNo}</span>
                        <span className="font-mono text-gray-400 text-[10px] truncate">{m.email}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5 mt-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-emerald-300 font-bold">Google Login Pass Access is Active</strong>
                    <span>
                      Each of the 4 participants can now log in at <strong>/login</strong> using their official college email (<code className="font-mono">@klu.ac.in</code>) and immediately download their official WEBX Event Pass.
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={`/verify/${createdTeam.teamId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View Live Event Pass</span>
                </a>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-3 rounded-xl glass-btn-secondary text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>Register Another Team</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* FORM VIEW */
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {error && (
                <div className="p-4 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-semibold flex items-start gap-3 shadow-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Team & Admission Details */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <Sparkles className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-200">
                    STEP 1: TEAM & PAYMENT SETUP
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Team Name */}
                  <div className="sm:col-span-1 flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-300 uppercase">
                      Team Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CYBER KNIGHTS"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white font-bold tracking-wide uppercase"
                    />
                  </div>

                  {/* Payment Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-300 uppercase">
                      Admission / Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as "VERIFIED" | "PENDING")}
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white bg-slate-900 border border-white/10 font-bold"
                    >
                      <option value="VERIFIED" className="text-emerald-400 bg-slate-900">
                        VERIFIED (Approved - Instant Pass Active)
                      </option>
                      <option value="PENDING" className="text-amber-400 bg-slate-900">
                        PENDING (Pending Verification)
                      </option>
                    </select>
                  </div>

                  {/* UTR Number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-300 uppercase">
                      Payment Ref / UTR
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. OFFLINE-CASH-01 or Bank UTR"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white font-mono"
                    />
                  </div>

                  {/* Payment Screenshot Upload */}
                  <div className="sm:col-span-3 flex flex-col gap-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-red-400" />
                        <span>Upload Payment Proof / Screenshot <span className="text-red-400">*</span></span>
                      </label>
                      {uploadedScreenshotUrl && (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Screenshot Attached</span>
                        </span>
                      )}
                    </div>

                    {!screenshotPreview ? (
                      <label className="border-2 border-dashed border-white/20 hover:border-red-500/60 rounded-2xl p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                        <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-white block">
                            Click to upload payment screenshot
                          </span>
                          <span className="text-[10px] text-gray-400">
                            PNG, JPG, JPEG or WEBP (Receipt / Transaction proof)
                          </span>
                        </div>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-white/10 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/20 shrink-0 bg-black">
                            <img
                              src={screenshotPreview}
                              alt="Screenshot Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white truncate max-w-xs">
                              {screenshotFile?.name || "Payment Receipt Screenshot"}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              {uploadingScreenshot ? `Uploading (${screenshotProgress}%)...` : "Uploaded and verified"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold uppercase transition-colors cursor-pointer">
                            <span>Replace</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleScreenshotChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleClearScreenshot}
                            className="p-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 transition-colors"
                            title="Remove screenshot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Teammates List (4 Members) */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-200">
                      STEP 2: 4 TEAM PARTICIPANTS & DESIGNATE TEAM LEAD
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-300">
                    ★ Click &quot;Set as Team Lead&quot; on any member to designate the leader
                  </span>
                </div>

                <div className="grid gap-4">
                  {members.map((m, idx) => {
                    const isLead = leadIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isLead
                            ? "bg-rose-950/30 border-rose-500/70 ring-1 ring-rose-500/40 shadow-xl shadow-rose-950/30"
                            : "bg-white/5 border-white/10"
                        }`}
                      >
                        {/* Member Header */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 gap-2 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shadow-md ${
                                isLead ? "bg-rose-600 text-white" : "bg-white/10 text-gray-300"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <strong className="text-white text-sm">
                                Participant {idx + 1}
                              </strong>
                              {isLead && (
                                <span className="ml-2 text-[10px] text-rose-300 font-bold uppercase tracking-wider">
                                  (Primary Team Contact & Lead)
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            {isLead ? (
                              <span className="px-3 py-1 rounded-lg bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                <span>OFFICIAL TEAM LEAD</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setLeadIndex(idx)}
                                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-rose-600/30 border border-white/15 hover:border-rose-500/50 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                              >
                                ★ Set as Team Lead
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Member Input Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                          {/* Name */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-gray-300 uppercase">
                              Full Name (SIS) <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. ARUN KUMAR"
                              value={m.name}
                              onChange={(e) => handleUpdateMember(idx, "name", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white uppercase"
                            />
                          </div>

                          {/* Reg No */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-gray-300 uppercase">
                              Registration No <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 2300030123"
                              value={m.regNo}
                              onChange={(e) => handleUpdateMember(idx, "regNo", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white font-mono uppercase"
                            />
                          </div>

                          {/* Email */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-gray-300 uppercase flex items-center justify-between">
                              <span>College Mail (@klu.ac.in) <span className="text-red-400">*</span></span>
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
                              placeholder="10-digit phone"
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

                          {/* Year & Section */}
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
                                className="w-full px-2.5 py-2 rounded-xl glass-input text-xs text-white uppercase"
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

                          {/* If Hosteller: Hostel & Room */}
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
                                  className="w-full px-2.5 py-2 rounded-xl glass-input text-xs text-white"
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

              {/* Submit Action Bar */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-300">
                  <span className="block font-bold text-white">Ready to register team?</span>
                  <span>A sequential Team ID (e.g. WEB-0XX) will be generated and saved to Firestore.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold uppercase transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-950 hover:scale-105 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? "Registering Team..." : "Confirm & Save Registration"}</span>
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
