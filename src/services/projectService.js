import { supabase } from "../lib/supabase";

export async function getProjects() {
  if (!supabase) throw new Error("Missing Supabase env variables");

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getFeaturedProjects() {
  if (!supabase) throw new Error("Missing Supabase env variables");

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("published", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw error;
  return data ?? [];
}

export async function getProjectBySlug(slug) {
  if (!supabase) throw new Error("Missing Supabase env variables");

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}
