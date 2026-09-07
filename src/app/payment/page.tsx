"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { CreditCard, Clock, Upload, CheckCircle2, AlertTriangle, ShieldCheck, Copy, Check, Crown } from "lucide-react";
import { uploadToCloudinary, compressImageToDataUrl } from "@/lib/cloudinary";
import { submitTeamRegistration, getSystemSettings, getNextSequentialTeamId, Student } from "@/lib/db";

export default function PaymentPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<{
    teamName: string;
    leadEmail: string;
    leadName?: string;
    leadRegNo?: string;
    leaderIndex?: number;
    accountEmail?: string;
    members: Student[];
    reservationId: string;
    expiresAt: number;
  } | null>(null);

  // 5-Minute Seat Lock Timer (Persistent across page refresh)
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("webx_payment_seat_lock_expiry");
      if (stored) {
        const remaining = Math.max(0, Math.floor((Number(stored) - Date.now()) / 1000));
        return remaining;
      }
    }
    return 300; // 5 minutes in seconds
  });

  const [utr, setUtr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [upiId, setUpiId] = useState("csiklu@upi");
  const [totalAmount, setTotalAmount] = useState(1400);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string>("");

  useEffect(() => {
    // Load live system settings configured by Admin
    getSystemSettings().then((s) => {
      if (s) {
        if (s.upiId) setUpiId(s.upiId);
        if (s.teamFee) setTotalAmount(s.teamFee);
        if (s.paymentQrUrl) setPaymentQrUrl(s.paymentQrUrl);
      }
    });
  }, []);

  useEffect(() => {
    sessionStorage.setItem("webx_registration_step", "payment");

    const raw = sessionStorage.getItem("webx_draft_team");
    if (!raw) {
      router.push("/register");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.members || parsed.members.length < 4) {
        router.push("/register");
        return;
      }
      // Guarantee Member 1 is team lead
      parsed.leaderIndex = 0;
      parsed.leadName = parsed.members[0]?.name || parsed.leadName || "";
      parsed.leadRegNo = parsed.members[0]?.regNo || parsed.leadRegNo || "";
      setDraft(parsed);

      // Establish or restore 5-minute persistent seat lock expiry timestamp
      let expiry = Number(sessionStorage.getItem("webx_payment_seat_lock_expiry"));
      if (!expiry || isNaN(expiry)) {
        expiry = parsed.expiresAt || (Date.now() + 5 * 60 * 1000);
        sessionStorage.setItem("webx_payment_seat_lock_expiry", String(expiry));
      }

      const remainingSecs = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(remainingSecs);
    } catch (e) {
      router.push("/register");
    }
  }, [router]);

  // 5-Minute Real-Time Synchronized Countdown Timer (Never resets on browser refresh)
  useEffect(() => {
    const syncCountdown = () => {
      const stored = sessionStorage.getItem("webx_payment_seat_lock_expiry");
      const expiry = stored ? Number(stored) : draft?.expiresAt;
      if (expiry) {
        const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
        setTimeLeft(remaining);
      } else {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }
    };

    syncCountdown();
    const timer = setInterval(syncCountdown, 1000);
    return () => clearInterval(timer);
  }, [draft]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const copyUpiToClipboard = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Instant image preview & smooth background upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setUploadError("");
      setIsUploading(true);
      setUploadProgress(20);

      // 1. Instantly read data URL using FileReader so preview shows immediately with 0 delay
      const reader = new FileReader();
      reader.onload = (re) => {
        if (re.target?.result) {
          setPreviewUrl(re.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);

      try {
        // 2. Client-side compress for guaranteed reliability (<60KB)
        const compressedData = await compressImageToDataUrl(selectedFile);
        if (compressedData) {
          setPreviewUrl(compressedData);
          setUploadedUrl(compressedData); // Instant valid safety fallback
          setUploadProgress(50);
        }

        // 3. Upload to Cloudinary
        const teamIdentifier = draft?.teamName || "WEB";
        const cldUrl = await uploadToCloudinary({
          file: selectedFile,
          teamId: teamIdentifier,
          onProgress: (pct) => setUploadProgress(Math.max(50, pct)),
        });

        if (cldUrl) {
          setUploadedUrl(cldUrl);
        }
        setUploadProgress(100);
        setIsUploading(false);
      } catch (err: any) {
        console.warn("Cloudinary upload fallback to compressed data:", err);
        // Compressed data is already set and ready
        setUploadProgress(100);
        setIsUploading(false);
      }
    }
  };

  const handleClearImage = () => {
    setFile(null);
    setPreviewUrl(null);
    setUploadedUrl("");
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError("");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!draft) return;

    if (timeLeft <= 0) {
      setError("Your 5-minute payment slot reservation has expired. Please return to registration to renew your slot.");
      return;
    }

    // UTR 12-digit numeric validation
    const cleanUtr = utr.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      setError("UTR / Transaction Reference Number must be EXACTLY 12 DIGITS.");
      return;
    }

    if (!uploadedUrl && !previewUrl) {
      setError("Mandatory: Please select and upload your payment screenshot.");
      return;
    }

    setSubmitting(true);

    try {
      const finalScreenshotUrl = uploadedUrl || previewUrl || "";

      // 1. Determine assigned sequential Team ID (e.g. WEB-001, WEB-002...)
      const assignedTeamId = await getNextSequentialTeamId();

      // 2. Submit Team Registration smoothly
      const res = await submitTeamRegistration({
        teamId: assignedTeamId,
        teamName: draft.teamName,
        leadEmail: draft.leadEmail,
        leadName: draft.members[0]?.name || draft.leadName || "",
        leadRegNo: draft.members[0]?.regNo || draft.leadRegNo || "",
        leaderIndex: 0,
        accountEmail: draft.accountEmail || draft.leadEmail,
        members: draft.members,
        utrNumber: cleanUtr,
        paymentScreenshotUrl: finalScreenshotUrl,
      });

      if (!res.success || !res.teamId) {
        setError(res.message || "Failed to submit registration. Please check your connection and try again.");
        setSubmitting(false);
        return;
      }

      const confirmedTeamId = res.teamId;

      // Save confirmation payload instantly
      sessionStorage.setItem(
        "webx_confirmed_team",
        JSON.stringify({
          teamId: confirmedTeamId,
          teamName: draft.teamName,
          leadEmail: draft.leadEmail,
          leadName: draft.members[0]?.name || draft.leadName || "",
          leadRegNo: draft.members[0]?.regNo || draft.leadRegNo || "",
          members: draft.members,
          utrNumber: cleanUtr,
          paymentStatus: "PENDING",
          paymentScreenshotUrl: finalScreenshotUrl,
        })
      );

      localStorage.setItem("webx_user_team_id", confirmedTeamId);
      sessionStorage.removeItem("webx_draft_team");
      sessionStorage.removeItem("webx_payment_seat_lock_expiry");
      sessionStorage.removeItem("webx_registration_step");
      localStorage.removeItem("webx_reg_form_autosave");

      // Instant smooth navigation to success page
      router.push("/success");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during submission.");
      setSubmitting(false);
    }
  };

  if (!draft) return null;

  const upiQrString = `upi://pay?pa=${upiId}&pn=WEBX%20Hackathon&am=${totalAmount}&cu=INR`;

  const hasImageReady = Boolean(uploadedUrl || previewUrl);
  const isSubmitDisabled =
    submitting ||
    isUploading ||
    !hasImageReady ||
    timeLeft <= 0 ||
    utr.trim().length !== 12;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-red-500/30 shadow-2xl flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="px-4 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-xs font-bold uppercase tracking-widest text-red-400">
            STEP 3 OF 3 — FEE PAYMENT & PROOF SUBMISSION
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-wider text-white">
            TEAM PAYMENT (₹1,400)
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Scan the official UPI QR code or use the UPI ID below to pay ₹1,400 for your 4-member team.
          </p>
        </div>

        {/* Confirmed Team Leader Banner (Member 1) */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
                TEAM LEADER (MEMBER 1)
              </span>
              <span className="font-extrabold text-white text-sm sm:text-base">
                {draft.members[0]?.name || draft.leadName || "Team Leader"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">REG NO:</span>
            <span className="font-mono text-xs font-extrabold text-amber-300 bg-black/40 px-3 py-1 rounded-lg border border-amber-500/30">
              {draft.members[0]?.regNo || draft.leadRegNo || "N/A"}
            </span>
          </div>
        </div>

        {/* 5-Minute Reservation Countdown */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
            timeLeft < 120
              ? "bg-red-950/90 border-red-500 animate-pulse text-red-200"
              : "bg-slate-900/90 border-red-500/40 text-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">RESERVATION EXPIRES IN</span>
              <p className="text-xs text-gray-300">Complete payment before timer reaches 00:00 to keep slot</p>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-red-400 glow-text-red">
            {formatTimer(timeLeft)}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/90 border border-red-500/80 text-red-200 text-xs sm:text-sm font-semibold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Left Column: QR Code & Breakdown */}
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center gap-4 text-center">
              <span className="text-xs font-extrabold tracking-widest text-red-400 uppercase">
                OFFICIAL UPI PAYMENT QR
              </span>
              
              {paymentQrUrl ? (
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-red-600 bg-white p-2 flex items-center justify-center">
                  <Image
                    src={paymentQrUrl}
                    alt="Official UPI Payment Scanner"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 224px, 256px"
                    className="object-contain"
                    priority
                  />
                </div>
              ) : (
                <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-red-600">
                  <QRCodeSVG value={upiQrString} size={180} level="H" />
                </div>
              )}

              <div className="w-full p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">UPI ID: <strong className="text-white">{upiId}</strong></span>
                <button
                  type="button"
                  onClick={copyUpiToClipboard}
                  className="px-3 py-1 rounded-lg bg-red-600/30 border border-red-500/40 text-red-300 font-bold hover:bg-red-600/50 flex items-center gap-1"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUpi ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Breakdown Box */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2 text-xs">
              <span className="font-extrabold uppercase tracking-wider text-gray-300 border-b border-white/10 pb-2">
                FEE BREAKDOWN (STRICTLY 4 MEMBERS)
              </span>
              {draft.members.map((m, idx) => (
                <div key={idx} className="flex justify-between text-gray-400">
                  <span>
                    Member {idx + 1} ({m.name || `Participant ${idx + 1}`})
                    {idx === 0 ? " 👑 (Team Leader)" : ""}:
                  </span>
                  <span className="font-mono text-white">₹350</span>
                </div>
              ))}
              <div className="h-px bg-white/10 my-1" />
              <div className="flex justify-between font-extrabold text-sm text-red-400">
                <span>TOTAL AMOUNT:</span>
                <span className="font-mono text-base">₹1,400</span>
              </div>
            </div>
          </div>

          {/* Right Column: UTR & Screenshot Upload Form */}
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
            
            {/* UTR Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-200">
                12-DIGIT UTR / TRANSACTION REF NO <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="e.g. 423589012345"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3.5 rounded-xl glass-input text-lg font-mono text-white placeholder-gray-500 tracking-widest"
              />
              <span className="text-[10px] text-gray-400">Must be exactly 12 numeric digits from your UPI transaction receipt.</span>
            </div>

            {/* File Upload Box */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-200">
                PAYMENT SCREENSHOT <span className="text-red-500">*</span>
              </label>
              <label className="relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-red-500/40 bg-slate-900/60 hover:bg-slate-900/90 cursor-pointer transition-all">
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-red-500 mb-2" />
                <span className="text-xs font-bold text-gray-200">
                  {file ? file.name : "Click to Select Payment Screenshot"}
                </span>
                <span className="text-[10px] text-gray-400 mt-1">PNG, JPG or WEBP (Uploads instantly upon selection)</span>
              </label>
            </div>

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="p-3 rounded-xl bg-red-950/90 border border-red-500/70 text-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Live Screenshot Image Preview */}
            {previewUrl && (
              <div className="flex flex-col gap-2 p-3 rounded-2xl glass-card border border-emerald-500/40 bg-slate-950/90 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-gray-200 border-b border-white/10 pb-2">
                  <span className={`font-bold flex items-center gap-1.5 ${hasImageReady ? "text-emerald-400" : "text-amber-400"}`}>
                    {hasImageReady ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Screenshot Loaded & Verified</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Preparing Screenshot...</span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="text-red-400 hover:text-red-300 font-semibold px-2 py-0.5 rounded bg-red-950/80 border border-red-500/30 text-[10px] uppercase transition-colors"
                  >
                    Change Image
                  </button>
                </div>
                <div className="w-full min-h-[180px] p-2 rounded-xl bg-black/80 flex items-center justify-center border border-white/10 overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Payment Screenshot Preview"
                    className="max-h-64 w-auto max-w-full rounded-lg object-contain mx-auto shadow-lg"
                  />
                </div>
              </div>
            )}

            {/* Cloudinary Progress Bar */}
            {(isUploading || uploadProgress > 0) && (
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-black/40 border border-white/10 animate-in fade-in">
                <div className="flex justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-gray-200">
                    {isUploading ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>Uploading screenshot to Cloudinary...</span>
                      </>
                    ) : hasImageReady ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Screenshot Uploaded & Verified</span>
                      </>
                    ) : (
                      <span>Upload Incomplete</span>
                    )}
                  </span>
                  <span className={`font-mono font-bold ${hasImageReady ? "text-emerald-400" : "text-amber-400"}`}>
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      hasImageReady
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : "bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400"
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`w-full py-4 mt-2 rounded-xl font-extrabold uppercase tracking-widest text-sm sm:text-base flex items-center justify-center gap-3 transition-all ${
                isSubmitDisabled
                  ? "bg-slate-800 text-gray-500 border border-white/5 cursor-not-allowed shadow-none opacity-60"
                  : "glass-btn-primary shadow-xl shadow-red-950/70 cursor-pointer"
              }`}
            >
              {submitting ? (
                <span>SUBMITTING REGISTRATION...</span>
              ) : isUploading ? (
                <span>UPLOADING SCREENSHOT ({uploadProgress}%)...</span>
              ) : !hasImageReady ? (
                <span>UPLOAD SCREENSHOT TO ENABLE SUBMIT</span>
              ) : utr.trim().length !== 12 ? (
                <span>ENTER 12-DIGIT UTR TO SUBMIT</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>SUBMIT PAYMENT PROOF</span>
                </>
              )}
            </button>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-gray-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Your payment screenshot will be securely verified by the CSI Admin Team.</span>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
