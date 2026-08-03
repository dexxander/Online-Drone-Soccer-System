export const COL = {
  users: "users",
  teams: "teams",
  players: "players",
  matches: "matches",
  tournaments: "tournaments",
  scores: "scores",
  marks: "marks",
  penalties: "penalties",
  standings: "standings",
  announcements: "announcements",
  notifications: "notifications",
  auditLogs: "audit_logs",
} as const;

export type CollectionName = (typeof COL)[keyof typeof COL];
