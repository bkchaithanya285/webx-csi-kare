"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, User, Building, Phone, Mail, Home, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { Student, checkTeamUniqueness, reserveTeamSlot, getTeamByCodeOrEmail, getCapacityStatus } from "@/lib/db";

const DEPARTMENTS = ["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL", "BIO", "Others"];
const YEARS = ["II", "III", "IV"];
const BOYS_HOSTELS = ["MH-1", "MH-2", "MH-3", "MH-4", "MH-5", "MH-6", "MH-7"];
const GIRLS_HOSTELS = ["LH-1", "LH-2", "LH-3", "LH-4"];

export default function RegisterPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [activeTab, setActiveTab] = useState<number>(0); // 0: Team Name, 1-4: Member 1..4
  const [leadEmail, setLeadEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationClosed, setRegistrationClosed] = useState(false);

  const [members, setMembers] = useState<Student[]>([
    { name: "", regNo: "", department: "", year: "", section: "", mobile: "", gender: "", accommodation: "Day Scholar", email: "" },
    { name: "", regNo: "", department: "", year: "", section: "", mobile: "", gender: "", accommodation: "Day Scholar", email: "" },
    { name: "", regNo: "", department: "", year: "", section: "", mobile: "", gender: "", accommodation: "Day Scholar", email: "" },
    { name: "", regNo: "", department: "", year: "", section: "", mobile: "", gender: "", accommodation: "Day Scholar", email: "" },
  ]);

  useEffect(() => {
    // Check if registrations are open
    getCapacityStatus().then((cap) => {
      if (!cap.registrationOpen || cap.isFull) {
        setRegistrationClosed(true);
      }
    });

    const email = localStorage.getItem("webx_lead_email");
    if (!email || !email.toLowerCase().endsWith("@klu.ac.in")) {
      localStorage.removeItem("webx_lead_email");
      localStorage.removeItem("webx_team_name");
      router.push("/login");
      return;
    }

    setLeadEmail(email);

    // If lead already registered a team, redirect immediately to their Event Pass on dashboard
    getTeamByCodeOrEmail(email).then((existingTeam) => {
      if (existingTeam) {
        router.replace("/dashboard");
      }
    });

    const prefix = email.split("@")[0].trim().toUpperCase();

    // 1. Try to restore any in-progress draft saved prior to refresh
    let restored = false;
    try {
      const savedRaw = localStorage.getItem("webx_reg_form_autosave");
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && saved.leadEmail === email) {
          if (saved.teamName) setTeamName(saved.teamName);
          if (typeof saved.activeTab === "number") setActiveTab(saved.activeTab);
          if (Array.isArray(saved.members) && saved.members.length === 4) {
            setMembers(saved.members);
            restored = true;
          }
        }
      }
    } catch (e) {}

    // 2. If no draft found, initialize default Member 1 with team lead details
    if (!restored) {
      setMembers((prev) => {
        const next = [...prev];
        next[0].email = email;
        if (!next[0].regNo && prefix) {
          next[0].regNo = prefix;
        }
        return next;
      });
    }
  }, [router]);

  const updateMember = (index: number, field: keyof Student, value: any) => {
    setMembers((prev) => {
      const next = [...prev];
      const m = { ...next[index], [field]: value };

      // Auto-generate email when regNo is entered
      if (field === "regNo") {
        const cleanReg = String(value).trim().toUpperCase();
        m.regNo = cleanReg;
        m.email = cleanReg ? `${cleanReg.toLowerCase()}@klu.ac.in` : "";
      }

      // Reset hostel if gender changes or if Day Scholar
      if (field === "gender") {
        delete m.hostel;
      }
      if (field === "accommodation" && value === "Day Scholar") {
        delete m.hostel;
        delete m.roomNo;
      }

      next[index] = m;
      return next;
    });
  };

  const validateMember = (m: Student, idx: number): string | null => {
    if (!m.name.trim()) return `Member ${idx + 1}: Name as per SIS is required.`;
    if (!m.regNo.trim()) return `Member ${idx + 1}: Registration Number is required.`;
    if (!/^[a-zA-Z0-9]{8,14}$/.test(m.regNo.trim())) return `Member ${idx + 1}: Valid Registration Number required.`;
    if (!m.email || !m.email.toLowerCase().endsWith("@klu.ac.in")) {
      return `Member ${idx + 1}: Must use official university email ending in @klu.ac.in.`;
    }
    if (!m.department) return `Member ${idx + 1}: Please select Department.`;
    if (!m.year) return `Member ${idx + 1}: Please select Year.`;
    if (!m.section.trim()) return `Member ${idx + 1}: Section is required.`;
    if (!m.gender) return `Member ${idx + 1}: Please select Gender.`;
    if (!/^\d{10}$/.test(m.mobile.trim())) return `Member ${idx + 1}: Valid 10-digit Mobile Number required.`;
    if (m.accommodation === "Hosteller") {
      if (!m.hostel) return `Member ${idx + 1}: Please select Hostel.`;
      if (!m.roomNo?.trim()) return `Member ${idx + 1}: Please enter Room Number.`;
    }
    return null;
  };

  // Real-time Auto-Save to localStorage so details never disappear on refresh
  useEffect(() => {
    if (!leadEmail) return;
    try {
      localStorage.setItem(
        "webx_reg_form_autosave",
        JSON.stringify({
          leadEmail,
          teamName,
          activeTab,
          members,
          updatedAt: Date.now(),
        })
      );
    } catch (e) {}
  }, [teamName, activeTab, members, leadEmail]);

  const handleResetDraft = () => {
    if (confirm("Clear all entered team details and start fresh?")) {
      localStorage.removeItem("webx_reg_form_autosave");
      setTeamName("");
      setActiveTab(0);
      const prefix = leadEmail.split("@")[0].trim().toUpperCase();
      setMembers([
        { name: "", regNo: prefix, department: "", year: "", section: "", mobile: "", gender: "", accommodation: "Day Scholar", email: leadEmail },
        { name: "", regNo: "", department: "", year: "", section: "", mobile: "", gender: "", accommodation: "Day Scholar", email: "" },
        { name: "", regNo: "", department: "", year: "", section: "", mobile: "", gender: "", accommodation: "Day Scholar", email: "" },
        { name: "", regNo: "", department: "", year: "", section: "", mobile: "", gender: "", accommodation: "Day Scholar", email: "" },
      ]);
    }
  };

  const handleReviewProceed = async () => {
    setError("");

    if (!teamName.trim()) {
      setError("Please provide a unique Team Name.");
      setActiveTab(0);
      return;
    }

    // Validate all 4 members
    const regNosSet = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const err = validateMember(members[i], i);
      if (err) {
        setError(err);
        setActiveTab(i + 1);
        return;
      }
      const reg = members[i].regNo.trim().toUpperCase();
      if (regNosSet.has(reg)) {
        setError(`Duplicate registration number "${reg}" within your team! Each participant must be unique.`);
        setActiveTab(i + 1);
        return;
      }
      regNosSet.add(reg);
    }

    setLoading(true);

    try {
      // Check if registration is still open
      const cap = await getCapacityStatus();
      if (!cap.registrationOpen || cap.isFull) {
        setError("Registrations are currently closed by the organizers.");
        setRegistrationClosed(true);
        setLoading(false);
        return;
      }

      // Check server-side uniqueness for team name and reg numbers
      const checkRes = await checkTeamUniqueness(teamName, Array.from(regNosSet));
      if (!checkRes.valid) {
        setError(checkRes.error || "Validation failed.");
        setLoading(false);
        return;
      }

      // Create 5-minute temporary seat reservation
      const resResult = await reserveTeamSlot(teamName, leadEmail);
      if (!resResult.success) {
        setError(resResult.message || "Failed to reserve slot.");
        setLoading(false);
        return;
      }

      const expiryTime = resResult.expiresAt || (Date.now() + 5 * 60 * 1000);

      // Save draft registration state for Review / Payment
      sessionStorage.setItem(
        "webx_draft_team",
        JSON.stringify({
          teamName: teamName.trim(),
          leadEmail,
          members,
          reservationId: resResult.reservationId,
          expiresAt: expiryTime,
        })
      );
      sessionStorage.setItem("webx_payment_seat_lock_expiry", String(expiryTime));

      router.push("/review");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Registration validation error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      <div className="glass-card rounded-3xl p-6 sm:p-12 border border-red-500/30 shadow-2xl flex flex-col gap-8">
        {registrationClosed ? (
          <div className="py-12 px-4 flex flex-col items-center text-center gap-6 animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-full bg-red-950/80 border-2 border-red-500/60 flex items-center justify-center shadow-2xl shadow-red-900/60">
              <ShieldAlert className="w-10 h-10 text-red-400 animate-pulse" />
            </div>

            <div className="flex flex-col gap-3">
              <div className="px-4 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-xs font-bold uppercase tracking-widest text-red-400 w-fit mx-auto">
                NOTICE FROM ORGANIZERS
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-white uppercase font-spiderman-title glow-text-red">
                REGISTRATIONS ARE CLOSED
              </h2>
              <p className="text-sm sm:text-base text-gray-300 max-w-lg mx-auto leading-relaxed">
                Team registrations for WEBX Hackathon 2026 are currently closed. You cannot submit or fill out team registration details at this time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-8 py-3.5 rounded-xl glass-btn-primary font-bold uppercase tracking-wider text-sm flex items-center gap-2 shadow-xl shadow-red-950/60"
              >
                <span>Return to Home</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="px-4 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-xs font-bold uppercase tracking-widest text-red-400">
                TEAM REGISTRATION (4 MEMBERS REQUIRED)
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-wider text-white">
                REGISTER YOUR TEAM
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 max-w-lg">
                Complete participant SIS records for all 4 team members to enter the payment reservation window.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/90 border border-red-500/70 text-red-200 text-xs sm:text-sm font-semibold flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Real-time Draft Auto-Save Bar */}
            <div className="flex items-center justify-between px-1 text-xs -mb-2">
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-500/30 px-3 py-1 rounded-lg shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Auto-Saved • Safe to refresh anytime</span>
              </span>
              <button
                type="button"
                onClick={handleResetDraft}
                className="text-gray-400 hover:text-red-400 text-[11px] font-semibold underline transition-colors"
                title="Clear entered details"
              >
                Clear Form
              </button>
            </div>

        {/* Tab Navigation: Team Name, Member 1, Member 2, Member 3, Member 4 */}
        <div className="grid grid-cols-5 gap-2 bg-slate-900/80 p-2 rounded-2xl border border-white/10 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab(0)}
            className={`py-3 rounded-xl transition-all ${
              activeTab === 0
                ? "bg-red-600 text-white shadow-lg shadow-red-950/60"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Team Info
          </button>
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              onClick={() => setActiveTab(num)}
              className={`py-3 rounded-xl transition-all flex items-center justify-center gap-1 ${
                activeTab === num
                  ? "bg-red-600 text-white shadow-lg shadow-red-950/60"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>{num === 1 ? "Mem 1 (Leader)" : `Mem ${num}`}</span>
            </button>
          ))}
        </div>

        {/* TAB 0: TEAM NAME */}
        {activeTab === 0 && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-extrabold uppercase tracking-wider text-gray-200">
                GLOBALLY UNIQUE TEAM NAME <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users className="w-5 h-5 text-gray-400 absolute left-4 top-4" />
                <input
                  type="text"
                  required
                  placeholder="e.g. CyberWeb Innovators"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl glass-input text-base text-white placeholder-gray-500 font-semibold"
                />
              </div>
              <span className="text-xs text-gray-400">Team names are checked globally and must be unique.</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="text-sm text-gray-300 font-medium">Team Lead Account:</span>
              <span className="text-sm font-extrabold text-red-400 bg-red-950/60 px-3 py-1 rounded-lg border border-red-500/30">
                {leadEmail}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className="w-full py-4 rounded-xl glass-btn-primary font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              <span>Proceed to Member 1 (Team Leader) Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1..4: MEMBER FORM */}
        {activeTab >= 1 && activeTab <= 4 && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span>{activeTab === 1 ? "MEMBER 1 (TEAM LEADER)" : `PARTICIPANT ${activeTab} OF 4`}</span>
                </h3>
                {activeTab === 1 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold tracking-wider uppercase">
                    TEAM LEADER
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-400">
                Member Fee: ₹350
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Name as per SIS */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Name as per SIS <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Full Name as per University SIS"
                  value={members[activeTab - 1].name}
                  onChange={(e) => updateMember(activeTab - 1, "name", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
                />
              </div>

              {/* Registration Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 99240040799"
                  value={members[activeTab - 1].regNo}
                  onChange={(e) => updateMember(activeTab - 1, "regNo", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white font-mono uppercase"
                />
              </div>

              {/* Auto Generated Email (Read-Only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Auto Generated KLU Email (Read-Only)
                </label>
                <input
                  type="text"
                  readOnly
                  value={members[activeTab - 1].email || "registrationnumber@klu.ac.in"}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-sm text-gray-400 font-mono cursor-not-allowed"
                />
              </div>

              {/* Mobile Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={members[activeTab - 1].mobile}
                  onChange={(e) => updateMember(activeTab - 1, "mobile", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white font-mono"
                />
              </div>

              {/* Department */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={members[activeTab - 1].department}
                  onChange={(e) => updateMember(activeTab - 1, "department", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white bg-slate-900"
                >
                  <option value="">-- Select Department --</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={members[activeTab - 1].year}
                  onChange={(e) => updateMember(activeTab - 1, "year", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white bg-slate-900"
                >
                  <option value="">-- Select Year --</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 24S10"
                  value={members[activeTab - 1].section}
                  onChange={(e) => updateMember(activeTab - 1, "section", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white uppercase"
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={members[activeTab - 1].gender}
                  onChange={(e) => updateMember(activeTab - 1, "gender", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white bg-slate-900"
                >
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Accommodation */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Accommodation Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Day Scholar", "Hosteller"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateMember(activeTab - 1, "accommodation", type)}
                      className={`py-3 rounded-xl font-bold text-xs uppercase transition-all ${
                        members[activeTab - 1].accommodation === type
                          ? "bg-red-600 text-white shadow-lg shadow-red-950/50 border border-red-400"
                          : "glass-btn-secondary text-gray-400"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Hosteller Fields */}
              {members[activeTab - 1].accommodation === "Hosteller" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Hostel <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={members[activeTab - 1].hostel || ""}
                      onChange={(e) => updateMember(activeTab - 1, "hostel", e.target.value)}
                      disabled={!members[activeTab - 1].gender}
                      className={`w-full px-4 py-3 rounded-xl glass-input text-sm text-white bg-slate-900 transition-all ${
                        !members[activeTab - 1].gender
                          ? "opacity-60 cursor-not-allowed border-dashed border-gray-600"
                          : ""
                      }`}
                    >
                      {!members[activeTab - 1].gender ? (
                        <option value="">-- Please Select Gender Above First --</option>
                      ) : (
                        <>
                          <option value="">-- Select {members[activeTab - 1].gender} Hostel --</option>
                          {members[activeTab - 1].gender === "Female"
                            ? GIRLS_HOSTELS.map((h) => (
                                <option key={h} value={h}>
                                  {h} (Girls)
                                </option>
                              ))
                            : BOYS_HOSTELS.map((h) => (
                                <option key={h} value={h}>
                                  {h} (Boys)
                                </option>
                              ))}
                        </>
                      )}
                    </select>
                    {!members[activeTab - 1].gender && (
                      <span className="text-[11px] text-amber-400 font-medium">
                        ⚠️ Please select Gender above first to view available hostels.
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Room Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 402-A"
                      value={members[activeTab - 1].roomNo || ""}
                      onChange={(e) => updateMember(activeTab - 1, "roomNo", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Navigation controls */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab - 1)}
                className="px-5 py-3 rounded-xl glass-btn-secondary font-bold text-xs uppercase flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {activeTab < 4 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab + 1)}
                  className="px-6 py-3 rounded-xl glass-btn-primary font-bold text-xs uppercase flex items-center gap-2"
                >
                  <span>Next Member</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleReviewProceed}
                  className="px-8 py-3.5 rounded-xl glass-btn-primary font-extrabold text-sm uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-red-950/60"
                >
                  <span>{loading ? "Validating..." : "PROCEED TO REVIEW"}</span>
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </>
    )}

      </div>
    </div>
  );
}
