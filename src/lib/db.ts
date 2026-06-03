import { DEMO_USER_ID } from "./constants";
import { getSupabase } from "./supabase";
import type {
  Action,
  ActionWithOpportunity,
  Draft,
  Message,
  Opportunity,
} from "./types";

export async function createOpportunity(
  data: Omit<Opportunity, "id" | "created_at" | "updated_at" | "user_id"> & {
    user_id?: string;
  }
): Promise<Opportunity> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from("opportunities")
    .insert({ ...data, user_id: data.user_id ?? DEMO_USER_ID })
    .select()
    .single();
  if (error) throw error;
  return row as Opportunity;
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("priority_score", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Opportunity[];
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("user_id", DEMO_USER_ID)
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
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("opportunities")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", DEMO_USER_ID)
    .select()
    .single();
  if (error) throw error;
  return data as Opportunity;
}

export async function deleteOpportunity(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("opportunities")
    .delete()
    .eq("id", id)
    .eq("user_id", DEMO_USER_ID);
  if (error) throw error;
}

export async function createMessage(
  data: Omit<Message, "id" | "created_at" | "user_id"> & { user_id?: string }
): Promise<Message> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from("messages")
    .insert({ ...data, user_id: data.user_id ?? DEMO_USER_ID })
    .select()
    .single();
  if (error) throw error;
  return row as Message;
}

export async function getMessagesForOpportunity(
  opportunityId: string
): Promise<Message[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", DEMO_USER_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function createAction(
  data: Omit<Action, "id" | "created_at" | "user_id" | "status"> & {
    user_id?: string;
    status?: string;
  }
): Promise<Action> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from("actions")
    .insert({
      ...data,
      user_id: data.user_id ?? DEMO_USER_ID,
      status: data.status ?? "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return row as Action;
}

export async function getPendingActions(): Promise<ActionWithOpportunity[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("actions")
    .select("*, opportunity:opportunities(*)")
    .eq("user_id", DEMO_USER_ID)
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
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("actions")
    .update({ status: "completed" })
    .eq("id", actionId)
    .eq("user_id", DEMO_USER_ID)
    .select()
    .single();
  if (error) throw error;
  return data as Action;
}

export async function createDraft(
  data: Omit<Draft, "id" | "created_at" | "user_id"> & { user_id?: string }
): Promise<Draft> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from("drafts")
    .insert({ ...data, user_id: data.user_id ?? DEMO_USER_ID })
    .select()
    .single();
  if (error) throw error;
  return row as Draft;
}

export async function getDraftsForOpportunity(
  opportunityId: string
): Promise<Draft[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", DEMO_USER_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Draft[];
}

export async function getActionsForOpportunity(
  opportunityId: string
): Promise<Action[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", DEMO_USER_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Action[];
}

export async function countOpportunities(): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("user_id", DEMO_USER_ID);
  if (error) throw error;
  return count ?? 0;
}

export async function countPendingActions(): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("actions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", DEMO_USER_ID)
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

export async function hasSeedData(): Promise<boolean> {
  const count = await countOpportunities();
  return count >= 5;
}

export async function getImportedGmailMessageIds(): Promise<Set<string>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("external_message_id")
    .eq("user_id", DEMO_USER_ID)
    .eq("source", "gmail")
    .not("external_message_id", "is", null);

  if (error) throw error;

  return new Set(
    (data ?? [])
      .map((row) => row.external_message_id as string | null)
      .filter((id): id is string => Boolean(id))
  );
}

export async function getMessageByExternalId(
  externalMessageId: string
): Promise<Message | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .eq("external_message_id", externalMessageId)
    .maybeSingle();

  if (error) throw error;
  return (data as Message | null) ?? null;
}
