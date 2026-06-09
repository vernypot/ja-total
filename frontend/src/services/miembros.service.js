import { sb } from "./supabase";

export async function getMiembros() {
  const { data } = await sb.from("miembros").select("*");
  return data;
}
