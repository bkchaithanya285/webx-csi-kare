import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
} from "firebase/firestore";

export interface Student {
  name: string;
  regNo: string;
  department: string;
  year: string;
  section: string;
  mobile: string;
  gender: string;
  accommodation: "Day Scholar" | "Hosteller";
  hostel?: string;
  roomNo?: string;
  email: string;
}

export interface TeamData {
  id?: string;
  teamId?: string; // e.g. WEB-001
  teamName: string;
  leadEmail: string;
  members: Student[];
  paymentStatus: "PENDING" | "VERIFIED" | "REJECTED";
  utrNumber: string;
  paymentScreenshotUrl: string;
  createdAt: any;
  updatedAt: any;
  rejectionReason?: string;
}

export interface ReservationData {
  id: string;
  teamName: string;
  leadEmail: string;
  expiresAt: number; // timestamp in ms
  createdAt: number;
}

export interface SystemSettings {
  maxTeams: number;
  registrationOpen: boolean;
  participantFee: number;
  teamFee: number;
  upiId: string;
  paymentQrUrl: string;
  whatsAppLink: string;
  hackathonDate: string;
  venue: string;
  lastAssignedTeamNumber?: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  maxTeams: 100,
  registrationOpen: true,
  participantFee: 350,
  teamFee: 1400,
  upiId: "csiklu@upi",
  paymentQrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=csiklu@upi&pn=WEBX%20Hackathon&am=1400",
  whatsAppLink: "https://chat.whatsapp.com/JOx52bGSXl5CageXABsRFa",
  hackathonDate: "3rd–4th October 2026",
  venue: "8th Block Seminar Hall",
  lastAssignedTeamNumber: 0,
};

// In-Memory Stale-While-Revalidate caches for ultra-fast, 0ms responses under high concurrency
let memorySettingsCache: { data: SystemSettings; expiresAt: number } | null = null;
let memoryCapacityCache: { data: any; expiresAt: number } | null = null;
const SETTINGS_CACHE_TTL = 3 * 1000; // 3s cache for near-instant admin updates
const CAPACITY_CACHE_TTL = 3 * 1000; // 3s cache

// Helper: Timeout wrapper for Firestore promises (5000ms max)
function withTimeout<T>(promise: Promise<T>, ms = 5000, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(fallback);
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

// Calculate lowest available missing Team ID starting from 1 (e.g. WEB-001)
export function getNextAvailableTeamId(existingTeamIds: string[]): string {
  const usedNumbers = new Set<number>();

  existingTeamIds.forEach((id) => {
    if (id && typeof id === "string") {
      const match = id.match(/WEB-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > 0) {
          usedNumbers.add(num);
        }
      }
    }
  });

  let candidate = 1;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }

  return `WEB-${String(candidate).padStart(3, "0")}`;
}

// Compute the next available sequential Team ID directly from Firestore
// Rules:
// 1. If there are NO teams in admin portal -> starts from WEB-001
// 2. If teams exist, advances forward (e.g. if WEB-023 is deleted in middle, next registration gets WEB-024)
// 3. Every team is guaranteed a unique Team ID
export async function getNextSequentialTeamId(): Promise<string> {
  let existingTeamsCount = 0;
  let maxExistingNumber = 0;
  const usedNumbers = new Set<number>();

  try {
    const snap = await getDocs(collection(db, "teams"));
    if (snap && !snap.empty) {
      existingTeamsCount = snap.size;
      snap.forEach((d) => {
        const tData = d.data() as TeamData;
        if (tData && tData.teamId) {
          const match = tData.teamId.match(/WEB-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > 0) {
              usedNumbers.add(num);
              if (num > maxExistingNumber) {
                maxExistingNumber = num;
              }
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn("Could not query teams snapshot for next ID:", err);
  }

  // Purge any lingering stale local storage keys
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("webx_registered_team_ids");
    } catch (e) {}
  }

  // Rule 1: If NO teams exist in admin portal, start fresh from WEB-001!
  if (existingTeamsCount === 0) {
    updateSystemSettings({ lastAssignedTeamNumber: 0 }).catch(() => {});
    return "WEB-001";
  }

  // Rule 2: If teams exist, monotonic progression based on highest assigned number
  const settings = await getSystemSettings().catch(() => DEFAULT_SETTINGS);
  const baseNumber = Math.max(maxExistingNumber, settings.lastAssignedTeamNumber || 0);
  let candidate = baseNumber + 1;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }

  return `WEB-${String(candidate).padStart(3, "0")}`;
}

// Initialize Settings Doc with short memory cache
export async function getSystemSettings(): Promise<SystemSettings> {
  const now = Date.now();
  if (memorySettingsCache && memorySettingsCache.expiresAt > now) {
    return memorySettingsCache.data;
  }

  try {
    const settingsRef = doc(db, "settings", "global");
    const snap = await withTimeout(getDoc(settingsRef), 5000, null);
    if (snap && snap.exists()) {
      const data = snap.data() as SystemSettings;
      const merged: SystemSettings = { ...DEFAULT_SETTINGS, ...data };
      memorySettingsCache = { data: merged, expiresAt: now + SETTINGS_CACHE_TTL };
      return merged;
    }
  } catch (error) {
    console.warn("getSystemSettings fetch error:", error);
  }

  if (memorySettingsCache) return memorySettingsCache.data;
  return DEFAULT_SETTINGS;
}

export async function updateSystemSettings(newSettings: Partial<SystemSettings>): Promise<void> {
  memorySettingsCache = null; // Invalidate memory cache immediately
  memoryCapacityCache = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("webx_cached_capacity");
    } catch (e) {}
  }
  try {
    const settingsRef = doc(db, "settings", "global");
    await setDoc(settingsRef, newSettings, { merge: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
  }
}

// Calculate Occupied Slots with short Memory Cache & Parallel Queries
export async function getCapacityStatus(): Promise<{
  maxTeams: number;
  confirmedTeamsCount: number;
  activeReservationsCount: number;
  occupiedSlots: number;
  availableSlots: number;
  isFull: boolean;
  registrationOpen: boolean;
}> {
  const now = Date.now();
  // 1. Instant memory cache hit if within TTL
  if (memoryCapacityCache && memoryCapacityCache.expiresAt > now) {
    return memoryCapacityCache.data;
  }

  try {
    // 2. Fetch settings, teams, and reservations concurrently in parallel!
    const [settingsRes, teamsRes, reservationsRes] = await Promise.allSettled([
      getSystemSettings(),
      withTimeout(getDocs(collection(db, "teams")), 5000, null),
      withTimeout(getDocs(collection(db, "reservations")), 5000, null),
    ]);

    const settings = settingsRes.status === "fulfilled" ? settingsRes.value : DEFAULT_SETTINGS;

    let confirmedTeamsCount = 0;
    if (teamsRes.status === "fulfilled" && teamsRes.value && !teamsRes.value.empty) {
      confirmedTeamsCount = teamsRes.value.size;
    }

    let activeReservationsCount = 0;
    if (reservationsRes.status === "fulfilled" && reservationsRes.value) {
      reservationsRes.value.forEach((docSnap) => {
        const data = docSnap.data() as ReservationData;
        if (data && data.expiresAt > now) {
          activeReservationsCount++;
        }
      });
    }

    const maxTeams = typeof settings.maxTeams === "number" ? settings.maxTeams : 100;
    const occupiedSlots = confirmedTeamsCount + activeReservationsCount;
    const availableSlots = Math.max(0, maxTeams - occupiedSlots);
    const isFull = occupiedSlots >= maxTeams;
    // Registration is open ONLY if explicitly open AND not full
    const registrationOpen = Boolean(settings.registrationOpen !== false && !isFull);

    const result = {
      maxTeams,
      confirmedTeamsCount,
      activeReservationsCount,
      occupiedSlots,
      availableSlots,
      isFull,
      registrationOpen,
    };

    // Cache in memory for subsequent requests
    memoryCapacityCache = {
      data: result,
      expiresAt: now + CAPACITY_CACHE_TTL,
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("webx_cached_capacity", JSON.stringify(result));
      } catch (e) {}
    }

    return result;
  } catch (error) {
    if (memoryCapacityCache) return memoryCapacityCache.data;
    return {
      maxTeams: 100,
      confirmedTeamsCount: 0,
      activeReservationsCount: 0,
      occupiedSlots: 0,
      availableSlots: 100,
      isFull: false,
      registrationOpen: true,
    };
  }
}

// 10-Minute Team Seat Reservation
export async function reserveTeamSlot(teamName: string, leadEmail: string): Promise<{ success: boolean; reservationId?: string; expiresAt?: number; message?: string }> {
  try {
    const reservationId = `RES-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const resRef = doc(db, "reservations", reservationId);
    withTimeout(
      setDoc(resRef, {
        id: reservationId,
        teamName,
        leadEmail,
        expiresAt,
        createdAt: Date.now(),
      }).catch((e) => {
        console.warn("Reservation background write:", e);
      }),
      1500,
      null
    );

    return { success: true, reservationId, expiresAt };
  } catch (error: any) {
    return { success: true, reservationId: `RES-${Date.now()}`, expiresAt: Date.now() + 600000 };
  }
}

// Check Duplicate Registration Numbers & Unique Team Name
export async function checkTeamUniqueness(teamName: string, regNumbers: string[]): Promise<{ valid: boolean; error?: string }> {
  try {
    const qTeam = query(collection(db, "teams"), where("teamName", "==", teamName.trim()));
    const teamSnap = await withTimeout(getDocs(qTeam), 1500, null);
    if (teamSnap && !teamSnap.empty) {
      return { valid: false, error: `Team name "${teamName}" is already taken.` };
    }

    const teamsSnap = await withTimeout(getDocs(collection(db, "teams")), 1500, null);
    if (teamsSnap) {
      const existingRegNos = new Set<string>();
      teamsSnap.forEach((docSnap) => {
        const data = docSnap.data() as TeamData;
        if (data.members) {
          data.members.forEach((m) => {
            if (m.regNo) existingRegNos.add(m.regNo.trim().toUpperCase());
          });
        }
      });

      for (const regNo of regNumbers) {
        const normalized = regNo.trim().toUpperCase();
        if (existingRegNos.has(normalized)) {
          return { valid: false, error: `Registration number "${normalized}" is already registered in another team.` };
        }
      }
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: true };
  }
}

// Team ID Generation & Registration Submission (Strict Sequential WEB-001, WEB-002, WEB-003...)
export async function submitTeamRegistration(
  data: Omit<TeamData, "teamId" | "paymentStatus" | "createdAt" | "updatedAt"> & { teamId?: string }
): Promise<{ success: boolean; teamId: string; message?: string }> {
  try {
    const existingIds: string[] = [];

    // Query all registered team IDs directly from Firestore
    try {
      const snap = await getDocs(collection(db, "teams"));
      if (snap && !snap.empty) {
        snap.forEach((d) => {
          const tData = d.data() as TeamData;
          if (tData && tData.teamId) {
            existingIds.push(tData.teamId);
          }
        });
      }
    } catch (err) {
      console.warn("Could not query teams snapshot, checking cached IDs:", err);
    }

    // Check local storage cache for any offline/recent submissions
    // Determine strictly sequential integer starting at WEB-001, then WEB-002, etc.
    const formattedId = data.teamId || getNextAvailableTeamId(existingIds);

    // Clear any legacy cached IDs
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("webx_registered_team_ids");
      } catch (e) {}
    }

    const newTeamRef = doc(collection(db, "teams"));

    // Safeguard against Firestore 1,048,487 byte document limit
    let safeScreenshotUrl = data.paymentScreenshotUrl || "";
    if (safeScreenshotUrl.length > 750000) {
      safeScreenshotUrl = safeScreenshotUrl.substring(0, 750000);
    }

    const newTeam: TeamData = {
      ...data,
      paymentScreenshotUrl: safeScreenshotUrl,
      id: newTeamRef.id,
      teamId: formattedId,
      paymentStatus: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save directly to Firestore
    await setDoc(newTeamRef, newTeam);

    // Update lastAssignedTeamNumber in settings so sequence advances monotonically without duplicating
    const match = formattedId.match(/WEB-(\d+)/i);
    if (match) {
      const assignedNum = parseInt(match[1], 10);
      if (!isNaN(assignedNum) && assignedNum > 0) {
        updateSystemSettings({ lastAssignedTeamNumber: assignedNum }).catch(() => {});
      }
    }

    // Save to local cache for instant 0ms access
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("webx_team_" + newTeam.leadEmail.toLowerCase(), JSON.stringify(newTeam));
        sessionStorage.setItem("webx_confirmed_team", JSON.stringify(newTeam));
      } catch (e) {}
    }

    return { success: true, teamId: formattedId };
  } catch (error: any) {
    console.error("Failed to submit team registration:", error);
    return { success: false, teamId: "WEB-001", message: error.message || "Failed to register team" };
  }
}

// Delete Team Registration & Free Up Team ID
export async function deleteTeamRegistration(teamIdOrDocId: string): Promise<boolean> {
  try {
    // 1. Invalidate capacity and settings cache
    memoryCapacityCache = null;
    memorySettingsCache = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("webx_cached_capacity");
        localStorage.removeItem("webx_registered_team_ids");
      } catch (e) {}
    }

    const clean = (teamIdOrDocId || "").trim().toLowerCase();

    // 2. Direct document deletion attempt
    try {
      await deleteDoc(doc(db, "teams", teamIdOrDocId));
    } catch (e) {}

    // 3. Query matching team doc by teamId, id, or doc.id
    const snap = await getDocs(collection(db, "teams"));
    if (snap && !snap.empty) {
      for (const d of snap.docs) {
        const data = d.data() as TeamData;
        const matchesTeamId = data.teamId && data.teamId.trim().toLowerCase() === clean;
        const matchesDocId = d.id.trim().toLowerCase() === clean;
        const matchesIdField = data.id && data.id.trim().toLowerCase() === clean;

        if (matchesTeamId || matchesDocId || matchesIdField) {
          await deleteDoc(doc(db, "teams", d.id));
          if (data.leadEmail) {
            teamMemoryCache.delete(data.leadEmail.toLowerCase());
            if (typeof window !== "undefined") {
              try {
                localStorage.removeItem("webx_team_" + data.leadEmail.toLowerCase());
              } catch (e) {}
            }
          }
          if (data.teamId) {
            if (typeof window !== "undefined") {
              try {
                localStorage.removeItem("webx_team_" + data.teamId.toLowerCase());
              } catch (e) {}
            }
          }
        }
      }
    }

    // 4. If all teams are now deleted in admin portal, reset sequence to WEB-001
    const checkSnap = await getDocs(collection(db, "teams"));
    if (checkSnap.empty) {
      await updateSystemSettings({ lastAssignedTeamNumber: 0 });
    }

    return true;
  } catch (err) {
    console.error("Delete team error:", err);
    return false;
  }
}

// High-concurrency team memory cache (30s TTL)
const teamMemoryCache = new Map<string, { data: TeamData; expiresAt: number }>();

// Authoritative team lookup: Firestore first (source of truth), then purges cache if deleted
export async function getTeamByCodeOrEmail(identifier: string): Promise<TeamData | null> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  // 1. Direct Firestore Query as the authoritative source of truth
  try {
    if (clean.includes("@")) {
      const q = query(collection(db, "teams"), where("leadEmail", "==", clean), limit(1));
      const snap = await getDocs(q);
      if (snap && !snap.empty) {
        const t = snap.docs[0].data() as TeamData;
        teamMemoryCache.set(clean, { data: t, expiresAt: Date.now() + 30000 });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("webx_team_" + clean, JSON.stringify(t));
            if (t.teamName) localStorage.setItem("webx_team_name", t.teamName);
          } catch (e) {}
        }
        return t;
      }
    } else {
      const q = query(collection(db, "teams"), where("teamId", "==", clean.toUpperCase()), limit(1));
      const snap = await getDocs(q);
      if (snap && !snap.empty) {
        const t = snap.docs[0].data() as TeamData;
        teamMemoryCache.set(clean, { data: t, expiresAt: Date.now() + 30000 });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("webx_team_" + clean, JSON.stringify(t));
            if (t.teamName) localStorage.setItem("webx_team_name", t.teamName);
          } catch (e) {}
        }
        return t;
      }
    }

    // Also check if participant is a member in any registered team in Firestore
    const snap = await getDocs(collection(db, "teams"));
    if (snap && !snap.empty) {
      for (const d of snap.docs) {
        const t = d.data() as TeamData;
        if (
          t.leadEmail?.toLowerCase() === clean ||
          t.teamId?.toLowerCase() === clean ||
          t.members?.some((m) => m.email?.toLowerCase() === clean || m.regNo?.toLowerCase() === clean)
        ) {
          teamMemoryCache.set(clean, { data: t, expiresAt: Date.now() + 30000 });
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("webx_team_" + clean, JSON.stringify(t));
              if (t.teamName) localStorage.setItem("webx_team_name", t.teamName);
            } catch (e) {}
          }
          return t;
        }
      }
    }

    // Team DOES NOT exist in Firestore (deleted by Admin or not yet registered)
    // PURGE all local and session caches so user is treated as a completely fresh registrant!
    teamMemoryCache.delete(clean);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("webx_team_" + clean);
        localStorage.removeItem("webx_team_name");
        const sessionTeam = sessionStorage.getItem("webx_confirmed_team");
        if (sessionTeam) {
          const parsed = JSON.parse(sessionTeam);
          if (
            parsed.leadEmail?.toLowerCase() === clean ||
            parsed.teamId?.toLowerCase() === clean ||
            parsed.members?.some((m: any) => m.email?.toLowerCase() === clean)
          ) {
            sessionStorage.removeItem("webx_confirmed_team");
          }
        }
      } catch (e) {}
    }

    return null;
  } catch (error) {
    console.warn("Firestore team check error (offline fallback):", error);
    // Only in catastrophic offline error, check local storage
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("webx_team_" + clean);
        if (cached) return JSON.parse(cached) as TeamData;
      } catch (e) {}
    }
    return null;
  }
}

