import { supabase } from "../lib/supabase";

export async function getProfile() {
  if (!supabase) throw new Error("Missing Supabase env variables");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSkills() {
  if (!supabase) throw new Error("Missing Supabase env variables");

  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getExperiences() {
  if (!supabase) throw new Error("Missing Supabase env variables");

  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
