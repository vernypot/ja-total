import { useEffect, useState } from 'react';
import { sb } from '../services/supabase';

export default function Clases({ miembroId }) {
  async function load() {
    const { data } = await sb
      .from("miembro_clase_progresiva")
      .select("clases_progresivas(*)")
      .eq("miembro_id", miembroId);
  }
}
