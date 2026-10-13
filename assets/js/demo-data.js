/* =============================================================================
   AssetVerify Property Services — Demo seed data (FICTIONAL)
   -----------------------------------------------------------------------------
   Used ONLY when Supabase is not configured (demo mode) so the site is fully
   explorable offline. Every record here is fictional and clearly labelled.
   Do not present these as real customers, checks, or results.
   ========================================================================== */
AssetVerify.DEMO_SEED = (function () {
  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  var users = [
    { id: "demo-admin",    email: "admin@example.com",   password: "admin123",   full_name: "Demo Administrator", phone: "+2340000000000", country: "Nigeria", role: "admin" },
    { id: "demo-customer", email: "customer@example.com", password: "customer123", full_name: "Demo Customer",      phone: "+2340000000001", country: "Nigeria", role: "customer" }
  ];

  var requests = [
    {
      id: "req-1001", reference: "AV-2026-000101", user_id: "demo-customer",
      customer_name: "Demo Customer", email: "customer@example.com", phone: "+2340000000001",
      preferred_contact: "email", country: "Nigeria", buying_remote: "locally",
      category: "land", asset_title: "Plot at Rumuokoro (sample)",
      state: "Rivers", lga: "Obio/Akpor", town: "Rumuokoro", address: "Off Airport Road (sample address)",
      gps: "4.83, 6.99", asking_price: 15000000, currency: "NGN",
      seller_contact: "Agent — +2340000000002 (sample)", intended_purchase_date: daysAgo(-20).slice(0,10),
      checks: ["doc_review", "title_search", "site_visit", "photos"],
      package_id: "land_standard", base_fee: 150000, professional_fees: 40000, third_party_fees: 25000, total_fee: 215000,
      custom_quote: false, terms_accepted: true,
      status: "in_progress", risk_level: null,
      created_at: daysAgo(6), updated_at: daysAgo(1)
    },
    {
      id: "req-1002", reference: "AV-2026-000102", user_id: "demo-customer",
      customer_name: "Demo Customer", email: "customer@example.com", phone: "+2340000000001",
      preferred_contact: "phone", country: "United Kingdom", buying_remote: "remotely",
      category: "house", asset_title: "3-bedroom bungalow, GRA Phase 2 (sample)",
      state: "Rivers", lga: "Port Harcourt", town: "Old GRA", address: "Sample Street, Old GRA",
      gps: "", asking_price: 85000000, currency: "NGN",
      seller_contact: "", intended_purchase_date: "",
      checks: ["doc_review", "title_search", "site_inspect", "occupation", "photos"],
      package_id: "house_full", base_fee: 275000, professional_fees: 60000, third_party_fees: 35000, total_fee: 370000,
      custom_quote: false, terms_accepted: true,
      status: "delivered", risk_level: "caution",
      created_at: daysAgo(30), updated_at: daysAgo(4)
    },
    {
      id: "req-1003", reference: "AV-2026-000103", user_id: "demo-customer",
      customer_name: "Demo Customer", email: "customer@example.com", phone: "+2340000000001",
      preferred_contact: "email", country: "Nigeria", buying_remote: "locally",
      category: "vehicle", asset_title: "Toyota Hilux 2019 (sample)",
      state: "Rivers", lga: "Port Harcourt", town: "Trans-Amadi", address: "Sample dealer lot",
      gps: "", asking_price: 32000000, currency: "NGN",
      seller_contact: "Dealer (sample)", intended_purchase_date: "",
      checks: ["identity", "vin_chassis", "doc_review", "mechanical"],
      package_id: "vehicle_standard", base_fee: 80000, professional_fees: 20000, third_party_fees: 15000, total_fee: 115000,
      custom_quote: false, terms_accepted: true,
      status: "awaiting_payment", risk_level: null,
      created_at: daysAgo(2), updated_at: daysAgo(1)
    },
    {
      id: "req-1004", reference: "AV-2026-000104", user_id: "demo-admin",
      customer_name: "Sample Buyer", email: "buyer@example.com", phone: "+2340000000003",
      preferred_contact: "whatsapp", country: "Nigeria", buying_remote: "locally",
      category: "land", asset_title: "Two plots, Igwuruta (sample)",
      state: "Rivers", lga: "Ikwerre", town: "Igwuruta", address: "Sample layout",
      gps: "", asking_price: 6000000, currency: "NGN",
      seller_contact: "", intended_purchase_date: "",
      checks: ["doc_review", "survey_check"],
      package_id: "land_basic", base_fee: 75000, professional_fees: 15000, third_party_fees: 20000, total_fee: 110000,
      custom_quote: false, terms_accepted: true,
      status: "submitted", risk_level: null,
      created_at: daysAgo(1), updated_at: daysAgo(1)
    }
  ];

  var documents = [
    { id: "doc-1", request_id: "req-1001", user_id: "demo-customer", doc_type: "survey_plan", filename: "sample-survey-plan.pdf", size: 245000, path: "demo/req-1001/survey.pdf", created_at: daysAgo(6) },
    { id: "doc-2", request_id: "req-1002", user_id: "demo-customer", doc_type: "title_doc", filename: "sample-title.pdf", size: 180000, path: "demo/req-1002/title.pdf", created_at: daysAgo(30) }
  ];

  var progress = [
    { id: "pu-1", request_id: "req-1001", message: "Request received and queued for initial review.", visible_to_customer: true, created_at: daysAgo(6) },
    { id: "pu-2", request_id: "req-1001", message: "Documents received. Initial review complete.", visible_to_customer: true, created_at: daysAgo(5) },
    { id: "pu-3", request_id: "req-1001", message: "Site visit scheduled. Verification in progress.", visible_to_customer: true, created_at: daysAgo(2) },
    { id: "pu-4", request_id: "req-1002", message: "Report completed and delivered.", visible_to_customer: true, created_at: daysAgo(4) }
  ];

  var reports = [
    {
      id: "rep-1", request_id: "req-1002", reference: "AV-2026-000102",
      risk_level: "caution",
      summary: "The visible condition and available documents were reviewed. Several items require clarification before purchase.",
      documents_received: "Deed of assignment (copy), survey plan (copy), seller identification (copy).",
      checks_performed: "Ownership document review; title search coordination; physical property inspection; occupation check.",
      findings: "1. Document review identified a name discrepancy on the deed copy that should be clarified.\n2. The property is physically occupied; tenancy terms were not evidenced in the documents provided.\n3. Minor visible dampness noted to the rear wall.",
      unresolved: "Confirmed registry search result and written confirmation of vacant possession were not available at the time of issue.",
      limitations: "This verification is a private due-diligence exercise. It is not a legal opinion and does not guarantee ownership. Findings depend on documents supplied and access granted.",
      next_steps: "Obtain a fresh survey, clarify the name discrepancy, and seek independent legal advice before payment.",
      contributors: "Field inspector (sample); Document reviewer (sample).",
      reviewer: "Demo Reviewer (sample)", version: 1, published: true, issued_at: daysAgo(4)
    }
  ];

  var quotations = [
    { id: "q-1", request_id: "req-1002", base_fee: 275000, professional_fees: 60000, third_party_fees: 35000, total: 370000, status: "accepted", created_at: daysAgo(29) },
    { id: "q-2", request_id: "req-1003", base_fee: 80000, professional_fees: 20000, third_party_fees: 15000, total: 115000, status: "issued", created_at: daysAgo(1) }
  ];

  var payments = [
    { id: "pay-1", request_id: "req-1002", amount: 370000, currency: "NGN", status: "confirmed", method: "bank_transfer", reference: "TRF-SAMPLE-001", confirmed_at: daysAgo(28), created_at: daysAgo(28) }
  ];

  var support = [
    { id: "sm-1", request_id: "req-1001", user_id: "demo-customer", from_customer: true, message: "Please confirm the site visit date.", created_at: daysAgo(3) },
    { id: "sm-2", request_id: "req-1001", user_id: "demo-admin", from_customer: false, message: "The visit is scheduled for the agreed date; we will update you.", created_at: daysAgo(2) }
  ];

  var audit = [
    { id: "al-1", actor: "demo-admin", action: "status_change", entity: "request:req-1001", detail: "awaiting_documents -> in_progress", created_at: daysAgo(2) },
    { id: "al-2", actor: "demo-admin", action: "report_published", entity: "report:rep-1", detail: "Published report v1", created_at: daysAgo(4) }
  ];

  return { users: users, requests: requests, documents: documents, progress: progress, reports: reports, quotations: quotations, payments: payments, support: support, audit: audit };
})();
