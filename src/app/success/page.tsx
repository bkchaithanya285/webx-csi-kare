"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { CheckCircle2, Download, MessageSquare, ShieldCheck, Calendar, MapPin, Users, Award, ExternalLink, FileImage, Clock } from "lucide-react";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import { Student, getTeamByCodeOrEmail } from "@/lib/db";

export default function SuccessPage() {
  const router = useRouter();
  const passRef = useRef<HTMLDivElement>(null);
  const [confirmed, setConfirmed] = useState<{
    teamId: string;
    teamName: string;
    leadEmail: string;
    members: Student[];
    utrNumber: string;
    paymentStatus: string;
    paymentScreenshotUrl: string;
  } | null>(null);

  const [downloadingType, setDownloadingType] = useState<"pdf" | "image" | null>(null);

  useEffect(() => {
    // Trigger celebratory confetti on mount
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#e50914", "#ffffff", "#38bdf8", "#f59e0b"],
      });
    } catch (e) {
      console.warn("Confetti error:", e);
    }

    const raw = sessionStorage.getItem("webx_confirmed_team");
    if (raw) {
      try {
        setConfirmed(JSON.parse(raw));
        return;
      } catch (e) {}
    }

    // If navigated directly, query Firestore for logged-in user's team
    const email = localStorage.getItem("webx_lead_email");
    if (email) {
      getTeamByCodeOrEmail(email).then((existing) => {
        if (existing) {
          setConfirmed(existing as any);
        } else {
          router.replace("/");
        }
      });
    } else {
      router.replace("/");
    }
  }, [router]);

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
      pdf.save(`WEBX_Event_Pass_${confirmed?.teamId || "WEB-001"}.pdf`);
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
      link.download = `WEBX_Event_Pass_${confirmed?.teamId || "WEB-001"}.png`;
      link.click();
    } catch (err) {
      console.error("Image Download error:", err);
      alert("Image download issue. You can take a screenshot of your pass below.");
    } finally {
      setDownloadingType(null);
    }
  };

  if (!confirmed) return null;

  const qrVerifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify/${confirmed.teamId}`
    : `https://webx-hackathon.klu.ac.in/verify/${confirmed.teamId}`;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 flex flex-col gap-8">
      
      {/* SUCCESS CONFIRMATION BANNER */}
      <div className="glass-card rounded-3xl p-8 border border-red-500/40 shadow-2xl flex flex-col items-center text-center gap-4 relative overflow-hidden">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>

        <span className="px-4 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-xs font-bold uppercase tracking-widest text-red-400">
          TEAM REGISTRATION SUBMITTED
        </span>

        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-wider text-white">
          REGISTRATION SUCCESSFUL 🎉
        </h2>

        <p className="text-sm sm:text-base text-gray-300 max-w-xl">
          Your payment screenshot and UTR <strong>({confirmed.utrNumber})</strong> have been logged. Your team is officially registered with Team ID:
        </p>

        {/* TEAM ID BADGE */}
        <div className="px-8 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-800 text-white font-extrabold font-mono text-2xl sm:text-3xl tracking-widest shadow-xl shadow-red-950/80 border border-red-400">
          {confirmed.teamId}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          <a
            href="https://chat.whatsapp.com/JOx52bGSXl5CageXABsRFa"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all hover:scale-105"
          >
            <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>JOIN OFFICIAL WHATSAPP GROUP</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleDownloadPassPDF}
            disabled={downloadingType !== null}
            className="px-6 py-3.5 rounded-xl glass-btn-primary font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950/60 disabled:opacity-50 hover:scale-105 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingType === "pdf" ? "CREATING PDF..." : "DOWNLOAD PASS (PDF)"}</span>
          </button>

          <button
            onClick={handleDownloadPassImage}
            disabled={downloadingType !== null}
            className="px-6 py-3.5 rounded-xl glass-btn-secondary font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-white/20 text-white hover:bg-white/10 disabled:opacity-50 hover:scale-105 transition-all"
          >
            <FileImage className="w-4 h-4 text-emerald-400" />
            <span>{downloadingType === "image" ? "SAVING PNG..." : "SAVE IMAGE (PNG)"}</span>
          </button>
        </div>
      </div>

      {/* OFFICIAL DIGITAL EVENT PASS CARD FOR PRINT / VERIFICATION */}
      <div
        ref={passRef}
        className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-red-500/50 shadow-2xl flex flex-col gap-6 relative overflow-hidden bg-slate-950/95"
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

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
              <h3 className="text-2xl sm:text-4xl font-black text-white tracking-wide">{confirmed.teamName}</h3>
            </div>

            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">TEAM ID:</span>
              <span className="text-4xl sm:text-6xl font-black font-mono text-red-500 glow-text-red tracking-wider">
                {confirmed.teamId}
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
            <span className="text-gray-400 block font-semibold uppercase text-[10px]">EVENT DATE & TIME</span>
            <span className="text-white font-bold flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-red-500" />
              08:30 AM, 3rd–4th October
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-gray-400 block font-semibold uppercase text-[10px]">PAYMENT (UTR)</span>
            <span className="text-emerald-400 font-mono font-bold block mt-1 truncate">
              {confirmed.utrNumber || "VERIFIED ON ADMISSION"}
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
            {confirmed.members.map((m, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <strong className="text-white block text-xs">{i + 1}. {m.name}</strong>
                  <span className="text-gray-400 font-mono text-[10px]">{m.department} • Sec {m.section}</span>
                </div>
                <span className="font-mono text-red-400 font-bold px-2 py-0.5 rounded bg-red-950 border border-red-500/30 text-xs">
                  {m.regNo}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Stamp Footer */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/15 text-[10px] font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="tracking-wider text-gray-300 uppercase">OFFICIAL VERIFIED BADGE • CSI KARE HACKATHON 2026</span>
          </div>
          <span className="text-gray-400">PASS ID: WEBX-{confirmed.teamId} • 2EE CREDITS COMPLIANT</span>
        </div>

      </div>

      <div className="flex justify-center">
        <Link
          href="/dashboard"
          className="px-8 py-3.5 rounded-xl glass-btn-secondary font-bold text-xs uppercase tracking-wider flex items-center gap-2"
        >
          <span>GO TO TEAM DASHBOARD</span>
        </Link>
      </div>

    </div>
  );
}
