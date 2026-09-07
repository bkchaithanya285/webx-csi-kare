import { TeamData, TeamMember } from "./db";

export interface TeamLeadInfo {
  leaderIndex: number;
  leadName: string;
  leadEmail: string;
  leadRegNo: string;
}

/**
 * Resolves the team leader information robustly for both historical/existing registrations
 * (which might lack leadName or leaderIndex) and future ones.
 */
export function getTeamLeadInfo(team: Partial<TeamData> | null | undefined): TeamLeadInfo {
  if (!team) {
    return { leaderIndex: 0, leadName: "", leadEmail: "", leadRegNo: "" };
  }

  const members: TeamMember[] = team.members || [];
  const cleanLeadEmail = (team.leadEmail || "").trim().toLowerCase();
  const cleanLeadRegNo = (team.leadRegNo || "").trim().toUpperCase();
  const cleanLeadName = (team.leadName || "").trim().toUpperCase();

  let leaderIndex = -1;

  // 1. If leaderIndex is explicitly valid (0 to members.length - 1)
  if (
    typeof team.leaderIndex === "number" &&
    team.leaderIndex >= 0 &&
    team.leaderIndex < members.length
  ) {
    leaderIndex = team.leaderIndex;
  }

  // 2. Try matching members by email
  if (leaderIndex === -1 && cleanLeadEmail) {
    const idx = members.findIndex(
      (m) => m.email && m.email.trim().toLowerCase() === cleanLeadEmail
    );
    if (idx !== -1) leaderIndex = idx;
  }

  // 3. Try matching member regNo with email prefix (e.g. 9922004000@klu.ac.in -> 9922004000)
  if (leaderIndex === -1 && cleanLeadEmail) {
    const prefix = cleanLeadEmail.split("@")[0].toUpperCase();
    const idx = members.findIndex(
      (m) => m.regNo && m.regNo.trim().toUpperCase() === prefix
    );
    if (idx !== -1) leaderIndex = idx;
  }

  // 4. Try matching member by leadRegNo
  if (leaderIndex === -1 && cleanLeadRegNo) {
    const idx = members.findIndex(
      (m) => m.regNo && m.regNo.trim().toUpperCase() === cleanLeadRegNo
    );
    if (idx !== -1) leaderIndex = idx;
  }

  // 5. Try matching member by leadName
  if (leaderIndex === -1 && cleanLeadName) {
    const idx = members.findIndex(
      (m) => m.name && m.name.trim().toUpperCase() === cleanLeadName
    );
    if (idx !== -1) leaderIndex = idx;
  }

  // 6. Default fallback to member 0 if available
  if (leaderIndex === -1) {
    leaderIndex = 0;
  }

  const leaderMember = members[leaderIndex] || members[0];

  const resolvedLeadName =
    (team.leadName && team.leadName.trim()) ||
    (leaderMember?.name && leaderMember.name.trim()) ||
    "Team Lead";

  const resolvedLeadEmail =
    (team.leadEmail && team.leadEmail.trim()) ||
    (leaderMember?.email && leaderMember.email.trim()) ||
    "";

  const resolvedLeadRegNo =
    (team.leadRegNo && team.leadRegNo.trim()) ||
    (leaderMember?.regNo && leaderMember.regNo.trim()) ||
    "";

  return {
    leaderIndex,
    leadName: resolvedLeadName,
    leadEmail: resolvedLeadEmail,
    leadRegNo: resolvedLeadRegNo,
  };
}

/**
 * Ensures team object has leadName and leaderIndex populated for seamless use everywhere.
 */
export function normalizeTeamLead<T extends Partial<TeamData>>(team: T): T {
  if (!team) return team;
  const info = getTeamLeadInfo(team);
  return {
    ...team,
    leadName: info.leadName,
    leadEmail: info.leadEmail || team.leadEmail,
    leadRegNo: info.leadRegNo || team.leadRegNo,
    leaderIndex: info.leaderIndex,
  };
}
