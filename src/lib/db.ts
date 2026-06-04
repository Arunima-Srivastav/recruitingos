import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEventLink, UserCalendarEvent } from "./calendar/types";
import type {
  Action,
  ActionWithOpportunity,
  Draft,
  Message,
  Opportunity,
} from "./types";

async function authContext() {
  const supabase = await createClient();
  const user = await requireUser();
  return { supabase, userId: user.id };
}

export async function createOpportunity(
  data: Omit<Opportunity, "id" | "created_at" | "updated_at" | "user_id">
): Promise<Opportunity> {
  const { supabase, userId } = await authContext();
  const { data: row, error } = await supabase
    .from("opportunities")
    .insert({ ...data, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return row as Opportunity;
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("user_id", userId)
    .order("priority_score", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Opportunity[];
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Opportunity;
}

export async function updateOpportunityStage(
  id: string,
  stage: string
): Promise<Opportunity> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("opportunities")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Opportunity;
}

export async function updateOpportunityDeadline(
  id: string,
  deadline: string | null
): Promise<Opportunity> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("opportunities")
    .update({ deadline, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Opportunity;
}

export async function deleteOpportunity(id: string): Promise<void> {
  const { supabase, userId } = await authContext();
  const { error } = await supabase
    .from("opportunities")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function createMessage(
  data: Omit<Message, "id" | "created_at" | "user_id">
): Promise<Message> {
  const { supabase, userId } = await authContext();
  const { data: row, error } = await supabase
    .from("messages")
    .insert({ ...data, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return row as Message;
}

export async function getMessagesForOpportunity(
  opportunityId: string
): Promise<Message[]> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function createAction(
  data: Omit<Action, "id" | "created_at" | "user_id" | "status"> & {
    status?: string;
  }
): Promise<Action> {
  const { supabase, userId } = await authContext();
  const { data: row, error } = await supabase
    .from("actions")
    .insert({
      ...data,
      user_id: userId,
      status: data.status ?? "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return row as Action;
}

export async function getPendingActions(): Promise<ActionWithOpportunity[]> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("actions")
    .select("*, opportunity:opportunities(*)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("priority_score", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { opportunity, ...action } = row as Action & {
      opportunity: Opportunity | null;
    };
    return { ...action, opportunity };
  });
}

export async function markActionComplete(actionId: string): Promise<Action> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("actions")
    .update({ status: "completed" })
    .eq("id", actionId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Action;
}

export async function updateActionDueAt(
  id: string,
  due_at: string | null
): Promise<Action> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("actions")
    .update({ due_at })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Action;
}

export async function createDraft(
  data: Omit<Draft, "id" | "created_at" | "user_id">
): Promise<Draft> {
  const { supabase, userId } = await authContext();
  const { data: row, error } = await supabase
    .from("drafts")
    .insert({ ...data, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return row as Draft;
}

export async function getDraftsForOpportunity(
  opportunityId: string
): Promise<Draft[]> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Draft[];
}

export async function getActionsForOpportunity(
  opportunityId: string
): Promise<Action[]> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Action[];
}

export async function countOpportunities(): Promise<number> {
  const { supabase, userId } = await authContext();
  const { count, error } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export async function countPendingActions(): Promise<number> {
  const { supabase, userId } = await authContext();
  const { count, error } = await supabase
    .from("actions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

export async function hasSeedData(): Promise<boolean> {
  const count = await countOpportunities();
  return count >= 5;
}

export async function getImportedGmailMessageIds(): Promise<Set<string>> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("messages")
    .select("external_message_id")
    .eq("user_id", userId)
    .eq("source", "gmail")
    .not("external_message_id", "is", null);

  if (error) throw error;

  return new Set(
    (data ?? [])
      .map((row) => row.external_message_id as string | null)
      .filter((id): id is string => Boolean(id))
  );
}

export async function getImportedGoogleCalendarEventIds(): Promise<Set<string>> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("messages")
    .select("external_message_id")
    .eq("user_id", userId)
    .eq("source", "calendar")
    .not("external_message_id", "is", null);

  if (error) throw error;

  return new Set(
    (data ?? [])
      .map((row) => {
        const id = row.external_message_id as string | null;
        return id?.startsWith("gcal:") ? id.slice(5) : null;
      })
      .filter((id): id is string => Boolean(id))
  );
}

export async function getMessageByExternalId(
  externalMessageId: string
): Promise<Message | null> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", userId)
    .eq("external_message_id", externalMessageId)
    .maybeSingle();

  if (error) throw error;
  return (data as Message | null) ?? null;
}

export async function getImportedExternalIdsWithPrefix(
  prefix: string
): Promise<Set<string>> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("messages")
    .select("external_message_id")
    .eq("user_id", userId)
    .like("external_message_id", `${prefix}%`);

  if (error) throw error;

  return new Set(
    (data ?? [])
      .map((row) => row.external_message_id)
      .filter((id): id is string => Boolean(id))
  );
}

export async function getCalendarEventLinks(): Promise<CalendarEventLink[]> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("calendar_event_links")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CalendarEventLink[];
}

export async function upsertCalendarEventLink(input: {
  source_kind: CalendarEventLink["source_kind"];
  source_id: string;
  google_event_id: string;
  google_calendar_id?: string;
}): Promise<CalendarEventLink> {
  const { supabase, userId } = await authContext();
  const row = {
    user_id: userId,
    source_kind: input.source_kind,
    source_id: input.source_id,
    google_event_id: input.google_event_id,
    google_calendar_id: input.google_calendar_id ?? "primary",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("calendar_event_links")
    .upsert(row, { onConflict: "user_id,source_kind,source_id" })
    .select()
    .single();

  if (error) throw error;
  return data as CalendarEventLink;
}

export async function deleteCalendarEventLink(id: string): Promise<void> {
  const { supabase, userId } = await authContext();
  const { error } = await supabase
    .from("calendar_event_links")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getUserCalendarEvents(
  rangeStart?: string,
  rangeEnd?: string
): Promise<UserCalendarEvent[]> {
  const { supabase, userId } = await authContext();
  let query = supabase
    .from("user_calendar_events")
    .select("*")
    .eq("user_id", userId)
    .order("starts_at", { ascending: true });

  if (rangeStart) {
    query = query.gte("starts_at", rangeStart);
  }
  if (rangeEnd) {
    query = query.lte("starts_at", rangeEnd);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as UserCalendarEvent[];
}

export async function getUserCalendarEventById(
  id: string
): Promise<UserCalendarEvent | null> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("user_calendar_events")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as UserCalendarEvent | null) ?? null;
}

export async function createUserCalendarEvent(input: {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  all_day?: boolean;
  opportunity_id?: string | null;
  google_event_id?: string | null;
  google_calendar_id?: string | null;
}): Promise<UserCalendarEvent> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("user_calendar_events")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      all_day: input.all_day ?? true,
      opportunity_id: input.opportunity_id ?? null,
      google_event_id: input.google_event_id ?? null,
      google_calendar_id: input.google_calendar_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as UserCalendarEvent;
}

export async function deleteUserCalendarEvent(
  id: string
): Promise<UserCalendarEvent | null> {
  const existing = await getUserCalendarEventById(id);
  if (!existing) return null;

  const { supabase, userId } = await authContext();
  const { error } = await supabase
    .from("user_calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return existing;
}

export async function updateUserCalendarEventGoogleIds(
  id: string,
  googleEventId: string,
  googleCalendarId = "primary"
): Promise<UserCalendarEvent> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("user_calendar_events")
    .update({
      google_event_id: googleEventId,
      google_calendar_id: googleCalendarId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserCalendarEvent;
}
