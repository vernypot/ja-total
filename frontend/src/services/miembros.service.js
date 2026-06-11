import { sb } from "./supabase";

export async function getMiembros() {
  const { data } = await sb.from("miembros").select("*");
  return data;
}

export async function createMiembro(miembro) {
  return await sb.from("miembros").insert([miembro]);
}

export async function updateMiembro(id, miembro) {
  return await sb.from("miembros").update(miembro).eq("id", id);
}

export async function deleteMiembro(id) {
  return await sb.from("miembros").delete().eq("id", id);
}