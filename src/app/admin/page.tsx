"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  Download,
  Settings,
  Users,
  CreditCard,
  Lock,
  Save,
  RefreshCw,
  X,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Upload,
  LogOut,
  Ticket,
  Archive,
} from "lucide-react";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { PrintableEventPass } from "@/components/PrintableEventPass";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  getCapacityStatus,
  getSystemSettings,
  updateSystemSettings,
  deleteTeamRegistration,
  TeamData,
  SystemSettings,
} from "@/lib/db";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [passError, setPassError] = useState("");

  const [activeTab, setActiveTab] = useState<"teams" | "settings">("teams");
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    maxTeams: 100,
    registrationOpen: true,
    participantFee: 350,
    teamFee: 1400,
    upiId: "csiklu@upi",
    paymentQrUrl: "",
    whatsAppLink: "https://chat.whatsapp.com/JOx52bGSXl5CageXABsRFa",
    hackathonDate: "3rd–4th October 2026",
    venue: "8th Block Seminar Hall",
  });

  const [capacityInfo, setCapacityInfo] = useState({
    maxTeams: 100,
    confirmedTeamsCount: 0,
    activeReservationsCount: 0,
    occupiedSlots: 0,
    availableSlots: 100,
    isFull: false,
    registrationOpen: true,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [qrUploading, setQrUploading] = useState(false);
  const [qrUploadProgress, setQrUploadProgress] = useState(0);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [exportingPasses, setExportingPasses] = useState(false);
  const [exportPassProgress, setExportPassProgress] = useState("");
  const [exportingSingleTeamId, setExportingSingleTeamId] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("admin-page");
    return () => {
      document.body.classList.remove("admin-page");
    };
  }, []);

  // Authenticate Admin Passcode
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass.trim() === "csi@221") {
      setIsAuthenticated(true);
      setPassError("");
    } else {
      setPassError("Invalid Admin Access Passcode!");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Load Settings
      const setts = await getSystemSettings();
      setSettings(setts);

      // 2. Load Capacity
      const cap = await getCapacityStatus();
      setCapacityInfo(cap);

      // 3. Load Teams from Firestore
      const snap = await getDocs(collection(db, "teams"));
      const loaded: TeamData[] = [];
      snap.forEach((d) => {
        loaded.push(d.data() as TeamData);
      });

      setTeams(loaded);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update Payment Status (Verify or Reject)
  const handleVerifyStatus = async (teamId: string, status: "VERIFIED" | "REJECTED", reason?: string) => {
    // 1. Instant UI update
    setTeams((prev) =>
      prev.map((t) => (t.teamId === teamId ? { ...t, paymentStatus: status, rejectionReason: reason } : t))
    );

    // 2. Also update session/local storage for team lead dashboard
    try {
      const confirmedRaw = sessionStorage.getItem("webx_confirmed_team");
      if (confirmedRaw) {
        const parsed = JSON.parse(confirmedRaw);
        if (parsed.teamId === teamId) {
          parsed.paymentStatus = status;
          sessionStorage.setItem("webx_confirmed_team", JSON.stringify(parsed));
        }
      }
    } catch (e) {}

    // 3. Close modal & show instant notification banner
    setSaveSuccess(`Team ${teamId} payment marked as ${status}!`);
    setTimeout(() => setSaveSuccess(""), 4000);
    setSelectedTeam(null);
    setShowRejectModal(false);
    setRejectReason("");

    // 4. Background non-blocking Firestore update
    try {
      const snap = await getDocs(collection(db, "teams"));
      snap.forEach((d) => {
        if (d.data().teamId === teamId) {
          updateDoc(doc(db, "teams", d.id), {
            paymentStatus: status,
            rejectionReason: reason || "",
            updatedAt: new Date().toISOString(),
          }).catch(console.warn);
        }
      });
    } catch (err) {
      console.warn("Background Firestore update warning:", err);
    }
  };

  // Delete Team Permanently & Free Up Slot
  const handleDeleteTeam = async (teamOrId: TeamData | string) => {
    const team = typeof teamOrId === "string" ? teams.find((t) => t.teamId === teamOrId || t.id === teamOrId) : teamOrId;
    const tId = team?.teamId || (typeof teamOrId === "string" ? teamOrId : "") || team?.id || "";
    const name = team?.teamName || tId;

    if (!confirm(`Are you sure you want to permanently delete Team "${name}" (${tId})? This will immediately remove their registration and payment records.`)) {
      return;
    }

    setDeletingTeamId(tId);

    // 1. Instant local UI state removal
    setTeams((prev) => prev.filter((t) => t.teamId !== tId && t.id !== (team?.id || tId)));
    if (selectedTeam?.teamId === tId || selectedTeam?.id === (team?.id || tId)) {
      setSelectedTeam(null);
    }

    try {
      // 2. Call backend delete helper with teamId and doc id
      if (team?.id) {
        await deleteTeamRegistration(team.id);
      }
      if (tId) {
        await deleteTeamRegistration(tId);
      }
      await loadAdminData();

      // 3. Show confirmation banner
      setSaveSuccess(`Team ${tId} deleted successfully!`);
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err) {
      console.error("Delete team error:", err);
      alert("Failed to delete team. Please try again.");
    } finally {
      setDeletingTeamId(null);
    }
  };

  // Save System Settings
  const handleSaveSettings = async () => {
    try {
      await updateSystemSettings(settings);
      setSaveSuccess("Settings successfully saved!");
      setTimeout(() => setSaveSuccess(""), 3000);
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // Upload or Change Official UPI Scanner Image
  const handleQrScannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    setQrUploading(true);
    setQrUploadProgress(0);

    try {
      const uploadedUrl = await uploadToCloudinary({
        file,
        onProgress: (percent) => setQrUploadProgress(percent),
      });

      const updatedSettings = { ...settings, paymentQrUrl: uploadedUrl };
      setSettings(updatedSettings);

      // Save directly into Firestore so payment page updates live
      await updateSystemSettings({ paymentQrUrl: uploadedUrl });
      setSaveSuccess("Official UPI Scanner image uploaded and live on payment page!");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err) {
      console.error("Failed to upload UPI scanner:", err);
      alert("Failed to upload scanner image. Please try again.");
    } finally {
      setQrUploading(false);
      setQrUploadProgress(0);
    }
  };

  // Remove Custom UPI Scanner (Reverts to generated QR)
  const handleRemoveQrScanner = async () => {
    if (!confirm("Remove custom UPI scanner image? The payment page will revert to the standard generated QR.")) return;
    const updatedSettings = { ...settings, paymentQrUrl: "" };
    setSettings(updatedSettings);
    await updateSystemSettings({ paymentQrUrl: "" });
    setSaveSuccess("Custom UPI Scanner removed. Reverted to standard QR.");
    setTimeout(() => setSaveSuccess(""), 3000);
  };

  // Export Data to Real Microsoft Excel (.xlsx) with 4 rows per team
  const exportToExcel = () => {
    if (filteredTeams.length === 0) {
      alert("No teams to export matching the current filter.");
      return;
    }

    // 4 rows per team (1 row per member), with dedicated Role and Gender columns
    const data: any[] = [];
    filteredTeams.forEach((t, tIdx) => {
      const mList = t.members || [];
      mList.forEach((m, mIdx) => {
        data.push({
          "Team #": tIdx + 1,
          "Team ID": t.teamId,
          "Team Name": t.teamName,
          "Role": mIdx === 0 ? "Leader (Member 1)" : `Member ${mIdx + 1}`,
          "Participant Name": m.name || "N/A",
          "Registration Number": m.regNo || "N/A",
          "Gender": m.gender || "N/A",
          "Department": m.department || "N/A",
          "Year": m.year || "N/A",
          "Section": m.section || "N/A",
          "Mobile": m.mobile || "N/A",
          "University Email": m.email || "N/A",
          "Accommodation": m.accommodation || "Day Scholar",
          "Hostel": m.hostel || "N/A",
          "Room No": m.roomNo || "N/A",
          "Payment Status": t.paymentStatus,
          "UTR / Ref No": t.utrNumber || "N/A",
          "Team Lead Email": t.leadEmail,
          "Registered At": t.createdAt ? new Date(t.createdAt).toLocaleString() : "N/A",
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Participants");

    // Auto calculate column widths
    const colWidths = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.max(key.length + 3, 15),
    }));
    worksheet["!cols"] = colWidths;

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `WEBX_2026_Participants_Export_${dateStr}.xlsx`);
  };

  // Export Data to CSV (4 rows per team)
  const exportToCSV = () => {
    if (filteredTeams.length === 0) {
      alert("No teams to export matching the current filter.");
      return;
    }

    const headers = [
      "Team #",
      "Team ID",
      "Team Name",
      "Role",
      "Participant Name",
      "Registration Number",
      "Gender",
      "Department",
      "Year",
      "Section",
      "Mobile",
      "University Email",
      "Accommodation",
      "Hostel",
      "Room No",
      "Payment Status",
      "UTR",
      "Team Lead Email",
      "Registered At",
    ].join(",");

    const rows: string[] = [];
    filteredTeams.forEach((t, tIdx) => {
      (t.members || []).forEach((m, mIdx) => {
        const role = mIdx === 0 ? "Leader (Member 1)" : `Member ${mIdx + 1}`;
        const regDate = t.createdAt ? new Date(t.createdAt).toLocaleString() : "N/A";
        rows.push(
          `"${tIdx + 1}","${t.teamId}","${t.teamName}","${role}","${m.name || ""}","${m.regNo || ""}","${m.gender || ""}","${m.department || ""}","${m.year || ""}","${m.section || ""}","${m.mobile || ""}","${m.email || ""}","${m.accommodation || ""}","${m.hostel || "N/A"}","${m.roomNo || "N/A"}","${t.paymentStatus}","${t.utrNumber || "N/A"}","${t.leadEmail}","${regDate}"`
        );
      });
    });

    const blob = new Blob([headers + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `WEBX_2026_Participants_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Export Organized Master Registration Report as PDF
  const exportToPdfReport = () => {
    if (filteredTeams.length === 0) {
      alert("No teams to export matching the current filter.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 32;
    const contentWidth = pageWidth - margin * 2;

    let currentY = margin;
    let pageNumber = 1;

    const drawHeader = () => {
      // Top Dark Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, currentY, contentWidth, 54, "F");

      // Red accent stripe
      doc.setFillColor(220, 38, 38); // red-600
      doc.rect(margin, currentY, 6, 54, "F");

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("CSI KARE • WEBX 2026 MASTER REGISTRATION REPORT", margin + 16, currentY + 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225); // slate-300
      const nowStr = new Date().toLocaleString();
      doc.text(
        `Generated: ${nowStr}  |  Filter: Status=${statusFilter}, Dept=${deptFilter}  |  Total Teams: ${filteredTeams.length} (${filteredTeams.length * 4} Confirmed Participants)`,
        margin + 16,
        currentY + 40
      );

      currentY += 64;
    };

    const drawFooter = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        "Computer Society of India (CSI) • Kalasalingam Academy of Research and Education • Confidential Administrative Report",
        margin,
        pageHeight - 18
      );
      doc.text(`Page ${pageNumber}`, pageWidth - margin - 35, pageHeight - 18);
    };

    drawHeader();
    drawFooter();

    const colX = {
      role: margin + 8,
      name: margin + 78,
      reg: margin + 205,
      gender: margin + 285,
      dept: margin + 345,
      year: margin + 395,
      sec: margin + 428,
      mobile: margin + 460,
      email: margin + 535,
      accomm: margin + 665,
    };

    filteredTeams.forEach((t) => {
      const cardHeight = 104; // 22 (team bar) + 16 (table headers) + 16*4 (member rows) = 102

      if (currentY + cardHeight > pageHeight - 35) {
        doc.addPage();
        pageNumber++;
        currentY = margin;
        drawHeader();
        drawFooter();
      }

      // 1. Team Header Bar
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(margin, currentY, contentWidth, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(239, 68, 68); // red-500
      doc.text(`[${t.teamId || "N/A"}]`, margin + 8, currentY + 15);

      doc.setTextColor(255, 255, 255);
      doc.text(`${t.teamName}`, margin + 68, currentY + 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`Lead: ${t.leadEmail}  |  UTR: ${t.utrNumber || "N/A"}`, margin + 250, currentY + 15);

      // Status Pill
      if (t.paymentStatus === "VERIFIED") {
        doc.setFillColor(6, 78, 59); // emerald-900
        doc.setTextColor(52, 211, 153); // emerald-400
      } else if (t.paymentStatus === "REJECTED") {
        doc.setFillColor(127, 29, 29); // red-900
        doc.setTextColor(248, 113, 113); // red-400
      } else {
        doc.setFillColor(120, 53, 15); // amber-900
        doc.setTextColor(251, 191, 36); // amber-400
      }
      doc.rect(contentWidth + margin - 72, currentY + 4, 68, 14, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(t.paymentStatus, contentWidth + margin - 68, currentY + 14);

      currentY += 22;

      // 2. Sub-table Headers
      doc.setFillColor(51, 65, 85); // slate-700
      doc.rect(margin, currentY, contentWidth, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);

      doc.text("ROLE", colX.role, currentY + 11);
      doc.text("NAME AS PER SIS", colX.name, currentY + 11);
      doc.text("REG NO", colX.reg, currentY + 11);
      doc.text("GENDER", colX.gender, currentY + 11);
      doc.text("DEPT", colX.dept, currentY + 11);
      doc.text("YR", colX.year, currentY + 11);
      doc.text("SEC", colX.sec, currentY + 11);
      doc.text("MOBILE", colX.mobile, currentY + 11);
      doc.text("UNIVERSITY EMAIL", colX.email, currentY + 11);
      doc.text("ACCOMMODATION", colX.accomm, currentY + 11);

      currentY += 15;

      // 3. 4 Member Rows
      const mList = t.members || [];
      mList.forEach((m, mIdx) => {
        const isLeader = mIdx === 0;
        const rowBg = mIdx % 2 === 0 ? [248, 250, 252] : [241, 245, 249];
        doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
        doc.rect(margin, currentY, contentWidth, 16, "F");

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, currentY + 16, margin + contentWidth, currentY + 16);

        doc.setFont("helvetica", isLeader ? "bold" : "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);

        const roleText = isLeader ? "Leader" : `Member ${mIdx + 1}`;
        doc.text(roleText, colX.role, currentY + 11);

        const nameTrunc = (m.name || "N/A").slice(0, 24);
        doc.text(nameTrunc, colX.name, currentY + 11);

        doc.setFont("courier", isLeader ? "bold" : "normal");
        doc.text(m.regNo || "N/A", colX.reg, currentY + 11);
        doc.setFont("helvetica", "normal");

        doc.text(m.gender || "N/A", colX.gender, currentY + 11);
        doc.text(m.department || "N/A", colX.dept, currentY + 11);
        doc.text(m.year ? `Yr ${m.year}` : "N/A", colX.year, currentY + 11);
        doc.text(m.section || "N/A", colX.sec, currentY + 11);
        doc.text(m.mobile || "N/A", colX.mobile, currentY + 11);

        const emailTrunc = (m.email || "N/A").slice(0, 22);
        doc.text(emailTrunc, colX.email, currentY + 11);

        const accommText =
          m.accommodation === "Hosteller" && m.hostel
            ? `${m.hostel} (${m.roomNo || "-"})`
            : (m.accommodation || "Day Scholar");
        doc.text(accommText.slice(0, 18), colX.accomm, currentY + 11);

        currentY += 16;
      });

      currentY += 8;
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`WEBX_2026_Official_Registration_Report_${dateStr}.pdf`);
    setSaveSuccess(`Official registration PDF report exported successfully!`);
    setTimeout(() => setSaveSuccess(""), 4000);
  };

  // 1. Download Single Team Event Pass PDF with Team ID
  const handleDownloadSinglePassPDF = async (team: TeamData) => {
    const tId = team.teamId || "TEAM";
    setExportingSingleTeamId(tId);
    try {
      const el = document.getElementById(`printable-pass-${tId}`);
      if (!el) {
        alert(`Pass element for Team ${tId} is preparing, please try in a moment.`);
        return;
      }
      const dataUrl = await htmlToImage.toPng(el, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#030712",
      });

      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [img.width, img.height],
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
      pdf.save(`WEBX_Event_Pass_${tId}.pdf`);
    } catch (err) {
      console.error("Single pass export error:", err);
      alert("Failed to export event pass PDF.");
    } finally {
      setExportingSingleTeamId(null);
    }
  };

  // 2. Download ALL Teams Event Passes as a single multi-page PDF
  const handleDownloadAllPassesPDF = async () => {
    const targetTeams = filteredTeams.length > 0 ? filteredTeams : teams;
    if (targetTeams.length === 0) {
      alert("No registered teams found to export.");
      return;
    }

    setExportingPasses(true);
    setExportPassProgress(`Preparing 0 / ${targetTeams.length}...`);

    try {
      let pdf: jsPDF | null = null;
      let exportedCount = 0;

      for (let i = 0; i < targetTeams.length; i++) {
        const t = targetTeams[i];
        setExportPassProgress(`Generating Pass ${i + 1} of ${targetTeams.length} (${t.teamId})...`);

        const el = document.getElementById(`printable-pass-${t.teamId}`);
        if (!el) continue;

        const dataUrl = await htmlToImage.toPng(el, {
          quality: 0.95,
          pixelRatio: 1.8,
          backgroundColor: "#030712",
        });

        const img = new window.Image();
        img.src = dataUrl;
        await new Promise((res) => { img.onload = res; });

        if (!pdf) {
          pdf = new jsPDF({
            orientation: "landscape",
            unit: "px",
            format: [img.width, img.height],
          });
          pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
        } else {
          pdf.addPage([img.width, img.height], "landscape");
          pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
        }
        exportedCount++;
      }

      if (pdf && exportedCount > 0) {
        const dateStr = new Date().toISOString().slice(0, 10);
        pdf.save(`WEBX_2026_All_Event_Passes_${dateStr}.pdf`);
        setSaveSuccess(`All ${exportedCount} event passes exported into unified PDF successfully!`);
        setTimeout(() => setSaveSuccess(""), 4000);
      } else {
        alert("Could not render pass elements. Please ensure teams are loaded.");
      }
    } catch (err) {
      console.error("Bulk pass export error:", err);
      alert("An error occurred while compiling passes.");
    } finally {
      setExportingPasses(false);
      setExportPassProgress("");
    }
  };

  // 3. Download Individual Event Passes for Each Team as a ZIP File
  const handleDownloadPassesZip = async () => {
    const targetTeams = filteredTeams.length > 0 ? filteredTeams : teams;
    if (targetTeams.length === 0) {
      alert("No registered teams found to export.");
      return;
    }

    setExportingPasses(true);
    setExportPassProgress(`Preparing 0 / ${targetTeams.length}...`);

    try {
      const zip = new JSZip();
      let count = 0;

      for (let i = 0; i < targetTeams.length; i++) {
        const t = targetTeams[i];
        setExportPassProgress(`Generating Pass ${i + 1}/${targetTeams.length} (${t.teamId})...`);

        const el = document.getElementById(`printable-pass-${t.teamId}`);
        if (!el) continue;

        const dataUrl = await htmlToImage.toPng(el, {
          quality: 0.96,
          pixelRatio: 1.8,
          backgroundColor: "#030712",
        });

        const cleanTeamId = (t.teamId || `TEAM_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, "");
        const cleanTeamName = (t.teamName || "Team").replace(/[^a-zA-Z0-9_-]/g, "_");

        const img = new window.Image();
        img.src = dataUrl;
        await new Promise((res) => { img.onload = res; });

        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
        const pdfBlob = pdf.output("blob");

        // Save individual PDF file named with the Team ID into the ZIP
        zip.file(`${cleanTeamId}_${cleanTeamName}_Event_Pass.pdf`, pdfBlob);
        count++;
      }

      if (count > 0) {
        setExportPassProgress("Packaging ZIP archive...");
        const zipContent = await zip.generateAsync({ type: "blob" });
        const dateStr = new Date().toISOString().slice(0, 10);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipContent);
        link.download = `WEBX_2026_Individual_Event_Passes_${dateStr}.zip`;
        link.click();

        setSaveSuccess(`All ${count} individual team passes exported in ZIP archive!`);
        setTimeout(() => setSaveSuccess(""), 4000);
      } else {
        alert("No pass elements were found to bundle into the ZIP.");
      }
    } catch (err) {
      console.error("ZIP export error:", err);
      alert("Failed to export passes ZIP archive.");
    } finally {
      setExportingPasses(false);
      setExportPassProgress("");
    }
  };

  // Multi-Filter & Search
  const filteredTeams = teams.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      t.teamId?.toLowerCase().includes(term) ||
      t.teamName.toLowerCase().includes(term) ||
      t.leadEmail.toLowerCase().includes(term) ||
      t.utrNumber.includes(term) ||
      t.members.some((m) => m.name.toLowerCase().includes(term) || m.regNo.toLowerCase().includes(term));

    const matchesStatus = statusFilter === "ALL" || t.paymentStatus === statusFilter;
    const matchesDept = deptFilter === "ALL" || t.members.some((m) => m.department === deptFilter);

    return matchesSearch && matchesStatus && matchesDept;
  });

  const pendingCount = teams.filter((t) => t.paymentStatus === "PENDING").length;
  const verifiedCount = teams.filter((t) => t.paymentStatus === "VERIFIED").length;
  const rejectedCount = teams.filter((t) => t.paymentStatus === "REJECTED").length;

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto py-16 px-4">
        <div className="glass-card rounded-3xl p-8 border border-red-500/40 shadow-2xl flex flex-col gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">PROTECTED ADMIN PORTAL</h2>
            <p className="text-xs text-gray-400 mt-1">Enter your admin passcode to access control center.</p>
          </div>

          {passError && (
            <div className="p-3 rounded-xl bg-red-950 border border-red-500 text-red-200 text-xs font-semibold">
              {passError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Admin Passcode"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-input text-center text-lg tracking-widest text-white"
            />
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl glass-btn-primary font-extrabold uppercase tracking-widest text-xs"
            >
              UNLOCK ADMIN DASHBOARD
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 flex flex-col gap-8">
      
      {/* Admin Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950 border border-red-500/40 text-xs font-extrabold text-red-400 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            WEBX CONTROL CENTER
          </div>
          <h2 className="text-3xl font-extrabold text-white">ADMIN DASHBOARD</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "teams"
                ? "bg-red-600 text-white shadow-lg shadow-red-950"
                : "glass-btn-secondary text-gray-300"
            }`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === "settings"
                ? "bg-red-600 text-white shadow-lg shadow-red-950"
                : "glass-btn-secondary text-gray-300"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setAdminPass("");
            }}
            title="Lock Admin Session"
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 glass-btn-secondary text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* STATS METRICS CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "TOTAL TEAMS", value: teams.length, color: "text-white" },
          { label: "CONFIRMED", value: capacityInfo.confirmedTeamsCount, color: "text-blue-400" },
          { label: "RESERVATIONS", value: capacityInfo.activeReservationsCount, color: "text-amber-400" },
          { label: "AVAILABLE", value: capacityInfo.availableSlots, color: "text-emerald-400" },
          { label: "PARTICIPANTS", value: teams.length * 4, color: "text-purple-400" },
          { label: "PENDING", value: pendingCount, color: "text-amber-400" },
          { label: "VERIFIED", value: verifiedCount, color: "text-emerald-400" },
          { label: "REJECTED", value: rejectedCount, color: "text-red-400" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-3 rounded-2xl border border-white/10 flex flex-col gap-1">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400">{s.label}</span>
            <span className={`text-xl font-extrabold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* TAB 1: TEAMS LIST & VERIFICATION */}
      {activeTab === "teams" && (
        <div className="flex flex-col gap-6">
          
          {/* Controls Bar: Search, Filters & CSV Export */}
          <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search Team ID, Name, Reg No, UTR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Only</option>
                <option value="VERIFIED">Verified Only</option>
                <option value="REJECTED">Rejected Only</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900"
              >
                <option value="ALL">All Departments</option>
                {["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL", "BIO"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <button
                onClick={exportToExcel}
                className="px-4 py-2 rounded-xl glass-btn-primary text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-950/60 bg-emerald-700 hover:bg-emerald-600 text-white"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                onClick={exportToCSV}
                className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/20 text-gray-300 hover:text-white"
                title="Export all participant rows to CSV (4 rows per team with Role & Gender)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              <button
                onClick={exportToPdfReport}
                className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-blue-500/40 text-blue-300 hover:text-white bg-blue-950/40 hover:bg-blue-900/60 transition-colors"
                title="Export a comprehensive, beautifully organized master registration PDF report"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Export PDF Report</span>
              </button>

              <button
                onClick={handleDownloadPassesZip}
                disabled={exportingPasses || filteredTeams.length === 0}
                className="px-4 py-2 rounded-xl glass-btn-primary text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-red-950/60 bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                title="Download individual event entry passes for each team as a ZIP file"
              >
                <Archive className="w-4 h-4" />
                <span>{exportingPasses ? exportPassProgress || "Packaging..." : "Download Passes (.ZIP)"}</span>
              </button>

              <button
                onClick={handleDownloadAllPassesPDF}
                disabled={exportingPasses || filteredTeams.length === 0}
                className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/20 text-gray-300 hover:text-white disabled:opacity-50"
                title="Compile all event passes into a single multi-page PDF"
              >
                <Ticket className="w-3.5 h-3.5 text-red-400" />
                <span>All Passes (PDF)</span>
              </button>
            </div>
          </div>

          {/* Teams Table */}
          <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-slate-900/90 text-gray-400 font-extrabold uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-4">Team ID</th>
                    <th className="p-4">Team Name</th>
                    <th className="p-4">Lead Email</th>
                    <th className="p-4">UTR Number</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {filteredTeams.map((t) => (
                    <tr key={t.teamId} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono font-bold text-red-400">{t.teamId}</td>
                      <td className="p-4 font-bold text-white">{t.teamName}</td>
                      <td className="p-4 font-mono text-gray-400">{t.leadEmail}</td>
                      <td className="p-4 font-mono text-gray-300">{t.utrNumber}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${
                            t.paymentStatus === "VERIFIED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                              : t.paymentStatus === "REJECTED"
                              ? "bg-red-950 text-red-300 border border-red-500/40"
                              : "bg-amber-950 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {t.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadSinglePassPDF(t)}
                            disabled={exportingSingleTeamId === t.teamId}
                            title="Download Team Event Pass (PDF)"
                            className="px-2.5 py-1.5 rounded-lg glass-btn-secondary text-emerald-400 hover:text-emerald-300 text-[11px] font-bold uppercase flex items-center gap-1 border border-emerald-500/30 hover:border-emerald-500/60 transition-colors disabled:opacity-50"
                          >
                            <Download className="w-3 h-3" />
                            <span>{exportingSingleTeamId === t.teamId ? "..." : "Pass"}</span>
                          </button>
                          <button
                            onClick={() => setSelectedTeam(t)}
                            className="px-3 py-1.5 rounded-lg glass-btn-secondary text-[11px] font-bold uppercase flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Inspect</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(t)}
                            disabled={deletingTeamId === t.teamId || deletingTeamId === t.id}
                            title="Permanently delete this team"
                            className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 text-[11px] font-bold uppercase flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>{deletingTeamId === t.teamId || deletingTeamId === t.id ? "Deleting..." : "Delete"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTeams.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-500 font-medium">
                        No registered teams found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM SETTINGS */}
      {activeTab === "settings" && (
        <div className="glass-card rounded-3xl p-8 border border-white/10 flex flex-col gap-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-500" />
            <span>GLOBAL HACKATHON SETTINGS</span>
          </h3>

          {saveSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-bold">
              {saveSuccess}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-gray-300">MAXIMUM TEAMS CAPACITY</label>
              <input
                type="number"
                min="1"
                value={settings.maxTeams || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSettings({ ...settings, maxTeams: isNaN(val) ? 0 : val });
                }}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-gray-300">REGISTRATION STATUS</label>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, registrationOpen: !settings.registrationOpen })}
                className={`py-3 rounded-xl font-extrabold text-xs uppercase ${
                  settings.registrationOpen
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "bg-red-600 text-white shadow-lg"
                }`}
              >
                {settings.registrationOpen ? "REGISTRATIONS OPEN" : "REGISTRATIONS CLOSED"}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-gray-300">PARTICIPANT FEE (₹)</label>
              <input
                type="number"
                value={settings.participantFee}
                onChange={(e) => setSettings({ ...settings, participantFee: parseInt(e.target.value) || 350 })}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-gray-300">OFFICIAL UPI ID</label>
              <input
                type="text"
                value={settings.upiId}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white font-mono"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold uppercase text-gray-300">OFFICIAL WHATSAPP GROUP LINK</label>
              <input
                type="text"
                value={settings.whatsAppLink}
                onChange={(e) => setSettings({ ...settings, whatsAppLink: e.target.value })}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
              />
            </div>

            {/* UPI SCANNER UPLOAD & EDIT SECTION */}
            <div className="flex flex-col gap-4 md:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10 mt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase text-gray-200 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-red-400" />
                    <span>OFFICIAL UPI QR SCANNER IMAGE</span>
                  </label>
                  <p className="text-xs text-gray-400">
                    Upload your official UPI QR scanner (PhonePe, Google Pay, Paytm, etc.). This image is displayed directly to students on the payment portal.
                  </p>
                </div>
                {settings.paymentQrUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveQrScanner}
                    className="px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold hover:bg-red-900 transition-colors"
                  >
                    Remove Scanner
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                {/* Image Preview Box */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-2 border-dashed border-red-500/50 bg-black/50 flex items-center justify-center shrink-0 shadow-xl">
                  {settings.paymentQrUrl ? (
                    <Image
                      src={settings.paymentQrUrl}
                      alt="UPI QR Scanner Preview"
                      fill
                      unoptimized
                      sizes="224px"
                      className="object-contain p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 p-4 text-center">
                      <CreditCard className="w-10 h-10 text-gray-600" />
                      <span className="text-[11px] font-medium">No custom scanner uploaded yet</span>
                      <span className="text-[10px] text-gray-600">(Standard generated QR active)</span>
                    </div>
                  )}

                  {qrUploading && (
                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <RefreshCw className="w-7 h-7 text-red-500 animate-spin" />
                      <span className="text-xs text-white font-bold">{qrUploadProgress}% Uploading...</span>
                    </div>
                  )}
                </div>

                {/* Upload Action */}
                <div className="flex flex-col gap-3 flex-1 w-full">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-gray-300 flex flex-col gap-1.5 leading-relaxed">
                    <span className="font-bold text-white">Scanner Image Guidelines:</span>
                    <span>• Supported formats: PNG, JPG, JPEG, WEBP (Max 10MB)</span>
                    <span>• Upload your original high-resolution QR scanner screenshot or image</span>
                    <span>• You can replace or change this image at any time</span>
                  </div>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrScannerUpload}
                      disabled={qrUploading}
                      className="hidden"
                    />
                    <div className="w-full py-3.5 px-4 rounded-xl glass-btn-secondary border border-red-500/40 text-red-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-center transition-all shadow-lg hover:scale-[1.01]">
                      <Upload className="w-4 h-4 text-red-400" />
                      <span>{settings.paymentQrUrl ? "CHANGE / UPLOAD NEW SCANNER IMAGE" : "UPLOAD UPI SCANNER IMAGE"}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="w-full py-4 rounded-xl glass-btn-primary font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>SAVE SYSTEM CONFIGURATION</span>
          </button>
        </div>
      )}

      {/* INSPECT TEAM & PAYMENT SCREENSHOT MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl glass-card rounded-3xl p-6 sm:p-8 border border-red-500/40 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono text-red-400 font-bold">{selectedTeam.teamId}</span>
                <h3 className="text-xl font-extrabold text-white">{selectedTeam.teamName}</h3>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Payment Screenshot & UTR */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase text-gray-300">UTR / TRANS REF NO:</span>
                <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-lg font-mono text-red-400 font-extrabold">
                  {selectedTeam.utrNumber}
                </div>

                <span className="text-xs font-bold uppercase text-gray-300 mt-2">CLOUDINARY SCREENSHOT PROOF:</span>
                <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/15 bg-slate-900">
                  {selectedTeam.paymentScreenshotUrl ? (
                    <Image
                      src={selectedTeam.paymentScreenshotUrl}
                      alt="Payment Screenshot"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                      No screenshot image uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className="flex flex-col gap-3 text-xs">
                <span className="text-xs font-bold uppercase text-gray-300">4 TEAM MEMBERS:</span>
                <div className="flex flex-col gap-2">
                  {selectedTeam.members.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <strong className="text-white block">{idx + 1}. {m.name} ({m.regNo})</strong>
                      <span className="text-gray-400">{m.department} • Year {m.year} • Sec {m.section} • {m.mobile}</span>
                      <br />
                      <span className="text-gray-400">Accomm: {m.accommodation} {m.hostel && `(${m.hostel} / ${m.roomNo})`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons: DELETE / REJECT / VERIFY */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                onClick={() => handleDeleteTeam(selectedTeam)}
                disabled={deletingTeamId === selectedTeam.teamId || deletingTeamId === selectedTeam.id}
                className="px-4 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-300 font-bold text-xs uppercase flex items-center gap-2 transition-colors disabled:opacity-50"
                title="Delete this team registration"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>{deletingTeamId === selectedTeam.teamId || deletingTeamId === selectedTeam.id ? "DELETING..." : "DELETE TEAM"}</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadSinglePassPDF(selectedTeam)}
                  disabled={exportingSingleTeamId === selectedTeam.teamId}
                  className="px-4 py-2.5 rounded-xl glass-btn-secondary text-emerald-400 hover:text-emerald-300 font-bold text-xs uppercase flex items-center gap-2 border border-emerald-500/40 transition-colors disabled:opacity-50"
                  title="Download this team's official Event Pass as PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>{exportingSingleTeamId === selectedTeam.teamId ? "Generating..." : "Download Pass (PDF)"}</span>
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-red-950 border border-red-500 text-red-300 font-bold text-xs uppercase flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>REJECT PAYMENT</span>
                </button>

                <button
                  onClick={() => handleVerifyStatus(selectedTeam.teamId!, "VERIFIED")}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center gap-2 shadow-lg shadow-emerald-950"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>VERIFY PAYMENT</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {showRejectModal && selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-red-500/50 flex flex-col gap-4">
            <h4 className="text-lg font-bold text-white">Enter Rejection Reason</h4>
            <textarea
              rows={3}
              placeholder="e.g. Invalid UTR number or blurry payment screenshot..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl glass-input text-xs text-white"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerifyStatus(selectedTeam.teamId!, "REJECTED", rejectReason)}
                className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-extrabold uppercase"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Offscreen Container for Generating High-Res Team Event Passes */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        {teams.map((t) => (
          <PrintableEventPass
            key={t.teamId || t.id}
            team={t}
            domId={`printable-pass-${t.teamId}`}
          />
        ))}
      </div>

    </div>
  );
}
