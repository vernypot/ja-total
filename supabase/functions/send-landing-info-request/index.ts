import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TO_EMAIL = Deno.env.get("LANDING_INFO_TO") || "vernypot@gmail.com";
const FROM_EMAIL = Deno.env.get("LANDING_INFO_FROM") || "Teofila <onboarding@resend.dev>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const nombre = String(body?.nombre || "").trim();
    const email = String(body?.email || "").trim();
    const iglesia = String(body?.iglesia || "").trim();
    const telefono = String(body?.telefono || "").trim();
    const mensaje = String(body?.mensaje || "").trim();
    const idioma = String(body?.idioma || "es").trim();
    const requestId = String(body?.request_id || "").trim();

    if (!nombre || !email || !mensaje) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `[Teofila] Solicitud de información — ${nombre}`;
    const html = `
      <h2>Nueva solicitud de información (Teofila)</h2>
      <p><strong>ID:</strong> ${escapeHtml(requestId || "—")}</p>
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(email)}</p>
      <p><strong>Iglesia:</strong> ${escapeHtml(iglesia || "—")}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(telefono || "—")}</p>
      <p><strong>Idioma:</strong> ${escapeHtml(idioma)}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${escapeHtml(mensaje).replaceAll("\n", "<br>")}</p>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      console.error("Resend error:", detail);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
