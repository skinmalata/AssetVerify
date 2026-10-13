// =============================================================================
// Supabase Edge Function: verify-payment  (OPTIONAL — not required for launch)
// -----------------------------------------------------------------------------
// Server-side payment verification for a Nigerian gateway (Paystack shown).
// The browser is NEVER trusted to mark an invoice paid: this function verifies
// the provider's signature / API response, then updates the database using the
// SERVICE ROLE key (which bypasses RLS and is only available server-side).
//
// Two uses:
//   1. POST { action: "initialize", requestId, email, amount } -> returns an
//      authorization_url for the customer to pay.
//   2. Paystack sends a webhook here; we verify the x-paystack-signature and
//      confirm the matching payment row.
//
// Secrets (set with `supabase secrets set`):
//   PAYSTACK_SECRET_KEY        sk_live_/sk_test_...
//   SUPABASE_URL               (auto-provided by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY  (auto-provided by Supabase)
//
// Deploy: supabase functions deploy verify-payment --no-verify-jwt
// =============================================================================
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const PAYSTACK = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

/** Verify a Paystack webhook signature (HMAC SHA-512 of the raw body). */
async function verifySignature(rawBody: string, signature: string | null) {
  if (!signature || !PAYSTACK) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(PAYSTACK),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const raw = await req.text();

  try {
    // --- Webhook path: Paystack sends events with a signature header ---
    const signature = req.headers.get("x-paystack-signature");
    if (signature) {
      if (!(await verifySignature(raw, signature))) {
        return new Response("invalid signature", { status: 401, headers: cors });
      }
      const event = JSON.parse(raw);
      if (event.event === "charge.success") {
        const data = event.data ?? {};
        const reference: string = data.reference ?? "";
        const db = admin();
        // Match by the reference we stored when initialising the payment.
        await db.from("payments")
          .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
          .eq("reference", reference);
      }
      return new Response("ok", { headers: cors });
    }

    // --- Initialise path: called from the (future) client integration ---
    const body = JSON.parse(raw);
    if (body.action === "initialize") {
      if (!PAYSTACK) {
        return new Response(JSON.stringify({ ok: false, error: "payment_not_configured" }), {
          status: 200, headers: { ...cors, "Content-Type": "application/json" }
        });
      }
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { "Authorization": `Bearer ${PAYSTACK}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: body.email,
          amount: Math.round(Number(body.amount) * 100), // kobo
          metadata: { request_id: body.requestId }
        })
      });
      const json = await res.json();
      // Record a pending payment with the gateway reference.
      if (json?.data?.reference) {
        await admin().from("payments").insert({
          request_id: body.requestId, amount: Number(body.amount),
          currency: "NGN", status: "pending", method: "paystack", reference: json.data.reference
        });
      }
      return new Response(JSON.stringify(json), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[verify-payment] error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
