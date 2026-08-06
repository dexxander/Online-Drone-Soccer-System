import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Team, Player, Tournament, AppUser, Announcement, AuditLogEntry, MatchSlot, MatchEvent, Penalty } from "./types";

// ============================================================================
// Auth Hooks
// ============================================================================

export function useAuthUser() {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: dbUser } = await supabase.from("users").select("*").eq("id", user.id).single();
      return { ...user, dbRole: dbUser?.role, dbStatus: dbUser?.status, dbUser };
    },
  });
}

// ============================================================================
// Query Hooks
// ============================================================================

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Team[];
    },
  });
}

export function usePlayers() {
  return useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Player[];
    },
  });
}

export function useTournaments() {
  return useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tournaments").select("*, tournament_matches(*)");
      if (error) throw error;
      return data as Tournament[];
    },
  });
}

export function useMatchSlots() {
  return useQuery({
    queryKey: ["match_slots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("match_slots").select("*, match_events(*), penalties(*)");
      if (error) throw error;
      return data as any[]; // Map this to match your MatchSlot type
    },
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as AppUser[];
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("timestamp", { ascending: false });
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useMutateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (team: Partial<Team>) => {
      if (team.id) {
        const { error } = await supabase.from("teams").update(team).eq("id", team.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teams").insert([team]);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useMutatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (player: Partial<Player>) => {
      if (player.id) {
        const { error } = await supabase.from("players").update(player).eq("id", player.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("players").insert([player]);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });
}

// Add more mutations as needed (e.g., useMutateTournament, useMutateMatchSlot)...
