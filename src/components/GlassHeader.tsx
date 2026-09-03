"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, UserCheck, LayoutDashboard, Menu, X, Sparkles, LogOut, User, ShieldAlert } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getTeamByCodeOrEmail, getCapacityStatus } from "@/lib/db";

export const GlassHeader: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [hasTeam, setHasTeam] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const cap = await getCapacityStatus();
        setRegistrationOpen(cap.registrationOpen);
      } catch (e) {}
    };
    checkStatus();
    const statusInterval = setInterval(checkStatus, 5000);

    const fetchTeamInfo = async (email: string) => {
      const t = await getTeamByCodeOrEmail(email);
      if (t) {
        setHasTeam(true);
        if (t.teamName) {
          setTeamName(t.teamName);
          localStorage.setItem("webx_team_name", t.teamName);
        }
      } else {
        setHasTeam(false);
        setTeamName(null);
      }
    };

    // Initial check from localStorage (enforcing @klu.ac.in)
    const saved = localStorage.getItem("webx_lead_email");
    if (saved && !saved.toLowerCase().endsWith("@klu.ac.in")) {
      localStorage.removeItem("webx_lead_email");
      localStorage.removeItem("webx_team_name");
      setLoggedInEmail(null);
      setHasTeam(false);
      setTeamName(null);
    } else if (saved) {
      const cachedTeamName = localStorage.getItem("webx_team_name");
      if (cachedTeamName) setTeamName(cachedTeamName);
      setLoggedInEmail(saved);
      fetchTeamInfo(saved);
    }

    // Subscribe to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        const email = user.email.toLowerCase();
        if (!email.endsWith("@klu.ac.in")) {
          // Immediately purge non-college accounts and sign out!
          await signOut(auth).catch(() => {});
          setLoggedInEmail(null);
          setHasTeam(false);
          setTeamName(null);
          localStorage.removeItem("webx_lead_email");
          localStorage.removeItem("webx_team_name");
          return;
        }
        setLoggedInEmail(email);
        localStorage.setItem("webx_lead_email", email);
        fetchTeamInfo(email);
      } else {
        const local = localStorage.getItem("webx_lead_email");
        if (local && local.toLowerCase().endsWith("@klu.ac.in")) {
          setLoggedInEmail(local);
          fetchTeamInfo(local);
        } else {
          setLoggedInEmail(null);
          setHasTeam(false);
          setTeamName(null);
          localStorage.removeItem("webx_lead_email");
          localStorage.removeItem("webx_team_name");
        }
      }
    });

    // Storage event for multi-tab or post-login sync
    const handleStorage = () => {
      const email = localStorage.getItem("webx_lead_email");
      if (email && email.toLowerCase().endsWith("@klu.ac.in")) {
        const name = localStorage.getItem("webx_team_name");
        if (name) setTeamName(name);
        setLoggedInEmail(email);
        fetchTeamInfo(email);
      } else {
        setLoggedInEmail(null);
        setHasTeam(false);
        setTeamName(null);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(statusInterval);
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    localStorage.removeItem("webx_lead_email");
    localStorage.removeItem("webx_team_name");
    setLoggedInEmail(null);
    setHasTeam(false);
    setTeamName(null);
  };

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href === "/#event-info") {
      if (pathname === "/") {
        e.preventDefault();
        const el = document.getElementById("event-info");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Event Details", href: "/#event-info" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full px-4 py-3 sm:px-8">
      <div className="max-w-7xl mx-auto rounded-2xl glass-panel px-4 py-3 sm:px-6 flex items-center justify-between transition-all border border-white/10 shadow-2xl backdrop-blur-xl">
        
        {/* Left / Center CSI Logo (Settled position) */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 transition-transform duration-300 group-hover:scale-110 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/csi logo.png"
              alt="CSI Club Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(229,9,20,0.6)]"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base sm:text-lg tracking-wider text-white">
              CSI KARE
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400 font-medium tracking-widest uppercase">
              Computer Society of India
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(link.href, e)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-red-600/30 text-white border border-red-500/40 shadow-lg shadow-red-950/40 glow-text-red"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons: Sign In / Register & User Session */}
        <div className="hidden md:flex items-center gap-3">
          {loggedInEmail ? (
            <div className="flex items-center gap-2">
              <Link
                href={hasTeam ? "/dashboard" : "/register"}
                title={hasTeam ? "View Team Event Pass" : "Register Your Team"}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold glass-panel border border-emerald-500/30 text-emerald-300 hover:border-emerald-500/60 hover:text-white flex items-center gap-1.5 transition-all"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="max-w-[160px] truncate font-bold text-white">
                  {teamName || loggedInEmail.split("@")[0]}
                </span>
                {hasTeam ? (
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase whitespace-nowrap">
                    (Event Pass)
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                    (Logged In)
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-semibold glass-btn-secondary flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-red-400" />
              <span>Login</span>
            </Link>
          )}

          {hasTeam ? (
            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-xl text-sm font-bold glass-btn-primary flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>My Event Pass</span>
            </Link>
          ) : !registrationOpen ? (
            <span className="px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border border-red-500/50 bg-red-950/70 text-red-300 shadow-md flex items-center gap-1.5 cursor-not-allowed">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Closed</span>
            </span>
          ) : (
            <Link
              href="/register"
              className="px-5 py-2 rounded-xl text-sm font-bold glass-btn-primary flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Enter the Web</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
        >
          {mobileMenuOpen ? <X className="w-6 h-6 text-red-400" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 mx-auto rounded-2xl glass-card p-5 flex flex-col gap-3 border border-red-500/30 animate-in fade-in slide-in-from-top-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => {
                handleNavClick(link.href, e);
                setMobileMenuOpen(false);
              }}
              className="px-4 py-2.5 rounded-xl text-base font-semibold text-gray-200 hover:text-white hover:bg-red-600/20 border border-transparent hover:border-red-500/30 transition-all"
            >
              {link.label}
            </Link>
          ))}
          <div className="h-px bg-white/10 my-1" />
          {loggedInEmail ? (
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 rounded-xl text-center font-semibold glass-btn-secondary text-red-400 hover:text-red-300 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out ({loggedInEmail.split("@")[0]})</span>
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 rounded-xl text-center font-semibold glass-btn-secondary"
            >
              Team Lead Login
            </Link>
          )}
          {hasTeam ? (
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 rounded-xl text-center font-bold glass-btn-primary"
            >
              My Event Pass
            </Link>
          ) : !registrationOpen ? (
            <div className="w-full py-3 rounded-xl text-center font-bold border border-red-500/40 bg-red-950/70 text-red-300 uppercase text-xs tracking-wider flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Registrations Closed</span>
            </div>
          ) : (
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 rounded-xl text-center font-bold glass-btn-primary"
            >
              Enter the Web
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
