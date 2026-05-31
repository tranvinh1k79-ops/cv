import { supabase } from "../lib/supabase";

export async function getNews() {
  if (!supabase) throw new Error("Missing Supabase env variables");

  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getLatestNews() {
  if (!supabase) throw new Error("Missing Supabase env variables");

  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw error;
  return data ?? [];
}

export async function getNewsBySlug(slug) {
  if (!supabase) throw new Error("Missing Supabase env variables");

  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}
