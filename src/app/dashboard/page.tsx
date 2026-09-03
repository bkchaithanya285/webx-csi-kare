"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import { 
  Users, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  MessageSquare, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  LogIn,
  FileImage,
  Printer 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getTeamByCodeOrEmail, TeamData } from "@/lib/db";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function DashboardPage() {
  const router = useRouter();
  const passRef = useRef<HTMLDivElement>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [leadEmail, setLeadEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingType, setDownloadingType] = useState<"pdf" | "image" | null>(null);
  const loadedEmailRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Initial check from localStorage (enforcing @klu.ac.in)
    const savedEmail = localStorage.getItem("webx_lead_email");
    if (savedEmail && !savedEmail.toLowerCase().endsWith("@klu.ac.in")) {
      localStorage.removeItem("webx_lead_email");
      localStorage.removeItem("webx_team_name");
      signOut(auth).catch(() => {});
      router.push("/login");
      return;
    } else if (savedEmail) {
      setLeadEmail(savedEmail);
      loadTeam(savedEmail);
    }

    // 2. Subscribe to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        const email = user.email.toLowerCase();
        if (!email.endsWith("@klu.ac.in")) {
          await signOut(auth).catch(() => {});
          localStorage.removeItem("webx_lead_email");
          localStorage.removeItem("webx_team_name");
          router.push("/login");
          return;
        }
        setLeadEmail(email);
        localStorage.setItem("webx_lead_email", email);
        if (loadedEmailRef.current !== email) {
          await loadTeam(email);
        }
      } else {
        const local = localStorage.getItem("webx_lead_email");
        if (local && local.toLowerCase().endsWith("@klu.ac.in")) {
          setLeadEmail(local);
          if (loadedEmailRef.current !== local) {
            await loadTeam(local);
          }
        } else {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loadTeam = async (email: string) => {
    loadedEmailRef.current = email;
    setLoading(true);
    try {
      const data = await getTeamByCodeOrEmail(email);
      if (!data) {
        // No active team found in database -> automatically redirect to register page
        router.replace("/register");
        return;
      }
      setTeam(data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const generatePassDataUrl = async (): Promise<string | null> => {
    if (!passRef.current) return null;
    try {
      return await htmlToImage.toPng(passRef.current, {
        quality: 1.0,
        pixelRatio: 2.5,
        backgroundColor: "#030712",
        cacheBust: true,
      });
    } catch (e) {
      console.warn("Primary html-to-image attempt failed, retrying:", e);
      return await htmlToImage.toPng(passRef.current, {
        pixelRatio: 2,
        backgroundColor: "#030712",
      });
    }
  };

  const handleDownloadPassPDF = async () => {
    setDownloadingType("pdf");
    try {
      const dataUrl = await generatePassDataUrl();
      if (!dataUrl) return;

      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pdf = new jsPDF({
        orientation: img.width > img.height ? "landscape" : "portrait",
        unit: "px",
        format: [img.width, img.height],
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
      pdf.save(`WEBX_Event_Pass_${team?.teamId || "PASS"}.pdf`);
    } catch (err) {
      console.error("PDF Download error:", err);
      alert("PDF download issue. You can use 'Save Image (PNG)' to save directly to your gallery.");
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadPassImage = async () => {
    setDownloadingType("image");
    try {
      const dataUrl = await generatePassDataUrl();
      if (!dataUrl) return;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `WEBX_Event_Pass_${team?.teamId || "PASS"}.png`;
      link.click();
    } catch (err) {
      console.error("Image Download error:", err);
      alert("Image download issue. You can take a screenshot of your pass below.");
    } finally {
      setDownloadingType(null);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto py-20 px-4 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <h3 className="text-xl font-extrabold text-white">LOCATING YOUR EVENT PASS...</h3>
        <p className="text-xs text-gray-400">Querying registered team records for your university account.</p>
      </div>
    );
  }

  // 2. Not Logged In State
  if (!leadEmail) {
    return (
      <div className="w-full max-w-md mx-auto py-16 px-4">
        <div className="glass-card rounded-3xl p-8 border border-red-500/30 text-center flex flex-col items-center gap-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <LogIn className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">SIGN IN REQUIRED</h2>
            <p className="text-xs text-gray-400 mt-1">
              Please sign in with your official university Google account to view your team's event pass and details.
            </p>
          </div>
          <Link
            href="/login"
            className="w-full py-3.5 rounded-xl glass-btn-primary font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950/60"
          >
            <span>Sign In with Google</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Logged In, But No Team Registered
  if (!team) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4">
        <div className="glass-card rounded-3xl p-8 border border-red-500/30 text-center flex flex-col items-center gap-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-gray-400 uppercase">LOGGED IN AS: {leadEmail}</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">NO TEAM REGISTERED YET</h2>
            <p className="text-xs text-gray-400 mt-2">
              You haven't completed registration for WEBX 2026. Complete your 4-member team details to reserve your slot and generate your Event Pass.
            </p>
          </div>
          <Link
            href="/register"
            className="w-full py-3.5 rounded-xl glass-btn-primary font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-red-950/60"
          >
            <Sparkles className="w-4 h-4" />
            <span>ENTER THE WEB (REGISTER NOW)</span>
          </Link>
        </div>
      </div>
    );
  }

  const qrVerifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify/${team.teamId}`
    : `https://webx-hackathon.klu.ac.in/verify/${team.teamId}`;

  // 4. Team Found -> Render Live Event Pass & Details
  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col gap-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-extrabold uppercase tracking-widest text-red-400">
              OFFICIAL EVENT PASS
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                team.paymentStatus === "VERIFIED"
                  ? "bg-emerald-950 border border-emerald-500 text-emerald-300"
                  : team.paymentStatus === "REJECTED"
                  ? "bg-red-950 border border-red-500 text-red-300"
                  : "bg-amber-950 border border-amber-500 text-amber-300"
              }`}
            >
              PAYMENT: {team.paymentStatus}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{team.teamName}</h1>
          <p className="text-xs text-gray-400">Team Lead: <span className="text-gray-200 font-mono">{team.leadEmail}</span></p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPassPDF}
            disabled={downloadingType !== null}
            className="px-4 py-2.5 rounded-xl glass-btn-primary font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950/60 hover:scale-105 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingType === "pdf" ? "Creating PDF..." : "Download Pass (PDF)"}</span>
          </button>

          <button
            onClick={handleDownloadPassImage}
            disabled={downloadingType !== null}
            className="px-4 py-2.5 rounded-xl glass-btn-secondary font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-white/20 text-white hover:bg-white/10 hover:scale-105 transition-all disabled:opacity-50"
          >
            <FileImage className="w-4 h-4 text-emerald-400" />
            <span>{downloadingType === "image" ? "Saving PNG..." : "Save Image (PNG)"}</span>
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="grid sm:grid-cols-2 gap-4">
        <a
          href="https://chat.whatsapp.com/JOx52bGSXl5CageXABsRFa"
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-2xl glass-panel border border-emerald-500/30 hover:border-emerald-500/60 flex items-center justify-between transition-all group bg-emerald-950/20 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600/30 transition-colors">
              <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </div>
            <div>
              <strong className="text-sm text-white block group-hover:text-emerald-400 transition-colors">
                Official WhatsApp Group
              </strong>
              <span className="text-xs text-gray-400">Join hackathon announcement channel</span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white" />
        </a>

        <div className="p-4 rounded-2xl glass-panel border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-sm text-white block">3rd–4th October 2026</strong>
              <span className="text-xs text-gray-400">8th Block Seminar Hall • 24 Hours</span>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-300">
            2EE CREDITS
          </div>
        </div>
      </div>

      {/* EVENT PASS TICKET (Canvas / PDF capture container) */}
      <div
        ref={passRef}
        className="w-full rounded-3xl p-6 sm:p-8 glass-card border-2 border-red-500/40 shadow-2xl relative overflow-hidden bg-slate-950/95"
      >
        {/* Background Spider Watermark & Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 pointer-events-none">
          <Image src="/assets/csi logo.png" alt="Watermark" fill sizes="192px" className="object-contain" />
        </div>

        {/* TOP SECTION: CSI BRANDING, TEAM NAME, ENLARGED TEAM ID & SIDE-BY-SIDE QR */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b-2 border-dashed border-red-500/30 pb-6">
          
          {/* Left: Branding, Large Team Name & Huge Team ID */}
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <Image src="/assets/csi logo.png" alt="CSI Logo" fill sizes="48px" className="object-contain" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-base sm:text-lg font-extrabold tracking-wider text-white">WEBX 2026 OFFICIAL PASS</h2>
                <span className="text-[10px] text-red-400 font-semibold uppercase tracking-widest">CSI KARE STUDENT CHAPTER</span>
              </div>
            </div>

            <div className="mt-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">TEAM NAME</span>
              <h3 className="text-2xl sm:text-4xl font-black text-white tracking-wide">{team.teamName}</h3>
            </div>

            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">TEAM ID:</span>
              <span className="text-4xl sm:text-6xl font-black font-mono text-red-500 glow-text-red tracking-wider">
                {team.teamId}
              </span>
            </div>
          </div>

          {/* Right: High-Res QR Code Side-by-Side on Top */}
          <div className="flex flex-col items-center gap-2 self-center md:self-auto bg-slate-900/90 p-4 rounded-2xl border border-red-500/40 shadow-2xl shadow-red-950/60">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ACTIVE ADMISSION PASS</span>
            </div>

            {/* Crisp QR Code with Corner Scan Brackets */}
            <div className="relative p-3.5 rounded-xl bg-white shadow-md">
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-red-600 rounded-tl" />
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-red-600 rounded-tr" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-red-600 rounded-bl" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-red-600 rounded-br" />

              <QRCodeSVG 
                value={qrVerifyUrl} 
                size={125} 
                level="Q" 
                includeMargin={false}
              />
            </div>

            <span className="text-[10px] font-extrabold text-white font-mono tracking-widest uppercase mt-1">
              SCAN TO VERIFY
            </span>
          </div>

        </div>

        {/* MIDDLE SECTION: EVENT VENUE, SCHEDULE & PAYMENT TRANSACTION */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 border-b border-white/10 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-gray-400 block font-semibold uppercase text-[10px]">EVENT VENUE</span>
            <span className="text-white font-bold flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              8th Block Seminar Hall
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-gray-400 block font-semibold uppercase text-[10px]">REPORTING TIME</span>
            <span className="text-white font-bold flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-red-500" />
              08:30 AM, 3rd October
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-gray-400 block font-semibold uppercase text-[10px]">PAYMENT REF (UTR)</span>
            <span className="text-emerald-400 font-mono font-bold block mt-1 truncate">
              {team.utrNumber || "VERIFIED ON ADMISSION"}
            </span>
          </div>
        </div>

        {/* BOTTOM SECTION: 4 TEAM PARTICIPANTS LIST */}
        <div className="pt-2 flex flex-col gap-2.5">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-red-500" />
            <span>TEAM PARTICIPANTS (4 MEMBERS)</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {team.members.map((m, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-1">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-white text-xs">{m.name}</strong>
                    {idx === 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-red-600/30 border border-red-500/40 text-[8px] font-bold text-red-300 uppercase">
                        LEAD
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-red-400 font-bold text-xs">{m.regNo}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-gray-400 text-[10px] pt-0.5">
                  <span>Dept: <strong className="text-gray-200">{m.department}</strong></span>
                  <span>Year: <strong className="text-gray-200">{m.year} ({m.section})</strong></span>
                  <span>Mobile: <strong className="text-gray-200 font-mono">{m.mobile}</strong></span>
                  <span>Accomm: <strong className="text-gray-200">{m.accommodation}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pass Footer Security Stamp */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-gray-400 font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="tracking-wider text-gray-300 uppercase">OFFICIAL VERIFIED BADGE • CSI KARE HACKATHON 2026</span>
          </div>
          <span className="text-gray-400">PASS ID: WEBX-{team.teamId} • 2EE CREDITS COMPLIANT</span>
        </div>

      </div>

    </div>
  );
}
