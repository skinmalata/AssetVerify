// =============================================================================
// Supabase Edge Function: send-email
// -----------------------------------------------------------------------------
// Sends transactional notification emails for the verification workflow.
// Credentials are read from Edge Function environment variables (set with
//   supabase secrets set EMAIL_API_KEY=... EMAIL_FROM=... ADMIN_NOTIFICATION_EMAIL=...)
// and are NEVER exposed to the browser.
//
// If EMAIL_API_KEY is absent, the function runs in DEVELOPMENT FALLBACK mode:
// it logs the email to the function console and returns a clear "not configured"
// flag, so the rest of the app keeps working.
//
// Deploy:  supabase functions deploy send-email
// =============================================================================
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const BUSINESS = Deno.env.get("BUSINESS_NAME") ?? "AssetVerify Property Services";
const FROM = Deno.env.get("EMAIL_FROM") ?? "AssetVerify <no-reply@example.com>";
const ADMIN = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") ?? "";

type Template =
  | "request_received" | "quotation_issued" | "payment_confirmed"
  | "documents_required" | "inspection_scheduled" | "verification_started"
  | "report_completed" | "request_cancelled" | "contact";

interface Payload {
  template: Template;
  request?: { reference?: string; customer_name?: string; asset_title?: string; total_fee?: number };
  email?: string;
  message?: Record<string, string>;
}

/** Build subject + plain-text body for each template. */
function build(t: Template, p: Payload): { subject: string; body: string } {
  const ref = p.request?.reference ?? "(no reference)";
  const name = p.request?.customer_name ?? "there";
  switch (t) {
    case "request_received":
      return { subject: `We received your verification request ${ref}`,
        body: `Dear ${name},\n\nThank you for your verification request. Your reference number is ${ref}.\n\nWhat happens next:\n1. We review your request and confirm the scope and price.\n2. We contact you about payment and any documents we still need.\n3. Once confirmed, verification begins.\n\n${BUSINESS}` };
    case "quotation_issued":
      return { subject: `Quotation for your request ${ref}`,
        body: `Dear ${name},\n\nYour quotation for request ${ref} is ready. Please sign in to your customer portal to review it.\n\n${BUSINESS}` };
    case "payment_confirmed":
      return { subject: `Payment confirmed for ${ref}`,
        body: `Dear ${name},\n\nWe have confirmed your payment for request ${ref}. Verification will proceed and you can follow progress in your portal.\n\n${BUSINESS}` };
    case "documents_required":
      return { subject: `More documents needed for ${ref}`,
        body: `Dear ${name},\n\nWe need additional documents to continue verification of request ${ref}. Please sign in to your portal to see what is required.\n\n${BUSINESS}` };
    case "inspection_scheduled":
      return { subject: `Inspection scheduled for ${ref}`,
        body: `Dear ${name},\n\nAn inspection has been scheduled for request ${ref}. We will confirm the date in your portal.\n\n${BUSINESS}` };
    case "verification_started":
      return { subject: `Verification started for ${ref}`,
        body: `Dear ${name},\n\nVerification of request ${ref} has started. We will update you as we progress.\n\n${BUSINESS}` };
    case "report_completed":
      return { subject: `Your report for ${ref} is ready`,
        body: `Dear ${name},\n\nYour verification report for request ${ref} is ready. Sign in to your portal to view it securely.\n\n${BUSINESS}` };
    case "request_cancelled":
      return { subject: `Request ${ref} cancelled`,
        body: `Dear ${name},\n\nRequest ${ref} has been cancelled. If this was unexpected, please contact us.\n\n${BUSINESS}` };
    case "contact":
      return { subject: `New website enquiry`, body: JSON.stringify(p.message, null, 2) };
    default:
      return { subject: `Notification from ${BUSINESS}`, body: JSON.stringify(p, null, 2) };
  }
}

async function sendEmail(to: string, subject: string, text: string) {
  const key = Deno.env.get("EMAIL_API_KEY");
  const provider = (Deno.env.get("EMAIL_PROVIDER") ?? "resend").toLowerCase();

  if (!key) {
    // Development fallback — no credentials configured.
    console.warn("[send-email] EMAIL_API_KEY not set. Development fallback.");
    console.log("[send-email] Would send:", { to, subject, text });
    return { sent: false, fallback: true, reason: "email_not_configured" };
  }

  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, text })
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    return { sent: true };
  }

  // Add other providers here (e.g. Postmark, Brevo). Keep secrets server-side.
  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const payload = await req.json() as Payload;
    const { subject, body } = build(payload.template ?? "request_received", payload);

    const to = payload.template === "contact" ? ADMIN : (payload.email ?? payload.request?.["email"] as unknown as string);
    const recipients: string[] = [];
    if (to) recipients.push(to);
    if (payload.template === "request_received" && ADMIN) recipients.push(ADMIN);

    const results = [];
    for (const r of [...new Set(recipients)]) {
      if (!r) continue;
      results.push({ to: r, ...(await sendEmail(r, subject, body)) });
    }
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[send-email] error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
