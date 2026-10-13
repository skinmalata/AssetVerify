/* =============================================================================
   AssetVerify Property Services — Public configuration
   -----------------------------------------------------------------------------
   This file is loaded by the browser and is therefore PUBLIC.
   NEVER put secrets (service-role keys, email API keys, payment secret keys)
   in this file. Only the Supabase URL and the "anon" public key belong here,
   because Row Level Security protects the data behind them.

   Leave SUPABASE_URL / SUPABASE_ANON_KEY empty to run the site in DEMO MODE.
   Demo mode uses your browser's localStorage with fictional sample records so
   you can try every screen before connecting Supabase. Configure Supabase to
   switch to the real, secure backend automatically.
   ========================================================================== */
window.AssetVerify = window.AssetVerify || {};

AssetVerify.CONFIG = {
  /* -------- Brand (temporary, easy to change) -------- */
  brand: {
    name: "AssetVerify Property Services",
    shortName: "AssetVerify",
    tagline: "Independent property & asset verification",
    initials: "AV",
    email: "info@example.com",
    phone: "+234 000 000 0000",
    whatsapp: "+2340000000000",
    address: "Port Harcourt, Rivers State, Nigeria",
    hours: "Mon–Fri, 9:00am – 5:00pm (WAT)",
    regNote: "Independent private due-diligence service. Not a government agency."
  },

  /* -------- Supabase (public keys only) -------- */
  supabase: {
    url: "",            // e.g. "https://abcdefgh.supabase.co"
    anonKey: ""         // the PUBLIC anon key
  },

  /* -------- Currency -------- */
  currency: {
    base: "NGN",
    symbol: "₦",
    secondary: "USD",
    usdRate: 1600        // approximate; display-only estimate. Update as needed.
  },

  /* -------- Asset categories -------- */
  categories: [
    { id: "land",      label: "Land / Plot",              icon: "🗺️" },
    { id: "house",     label: "House / Building",         icon: "🏠" },
    { id: "vehicle",   label: "Vehicle",                  icon: "🚗" },
    { id: "equipment", label: "Equipment / Machinery",    icon: "⚙️" },
    { id: "other",     label: "Other Asset",              icon: "📦" }
  ],

  /* -------- Checks available per category (Step 3 of request form) -------- */
  checksByCategory: {
    land: [
      { id: "doc_review",     label: "Ownership document review",     desc: "Review available title and ownership documents." },
      { id: "title_search",   label: "Title / land registry search coordination", desc: "Coordinate searches with the relevant registry where accessible." },
      { id: "survey_check",   label: "Survey plan check & charting",  desc: "Coordinate survey-plan verification with a registered surveyor." },
      { id: "gov_records",    label: "Government acquisition / encumbrance check", desc: "Investigate relevant acquisition and encumbrance records where accessible." },
      { id: "site_visit",     label: "Physical site visit",           desc: "Visit the site and document boundaries, access and occupation." },
      { id: "photos",         label: "Site & boundary photographs",   desc: "Capture dated photographic evidence." }
    ],
    house: [
      { id: "doc_review",     label: "Ownership & seller-authority review", desc: "Review available documents and the seller's authority to sell." },
      { id: "title_search",   label: "Title search coordination",     desc: "Coordinate relevant title searches." },
      { id: "site_inspect",   label: "Property inspection",           desc: "Inspect the property and visible condition." },
      { id: "occupation",     label: "Occupation / tenancy check",    desc: "Record who occupies the property and on what terms." },
      { id: "building_cond",  label: "Building condition inspection",  desc: "Specialist inspection of visible defects (third-party fee)." },
      { id: "photos",         label: "Inspection photographs",         desc: "Capture dated photographic evidence." }
    ],
    vehicle: [
      { id: "identity",       label: "Identity & registration check",  desc: "Check vehicle identity and available registration information." },
      { id: "vin_chassis",    label: "VIN / chassis inspection",       desc: "Inspect VIN and chassis identifiers." },
      { id: "doc_review",     label: "Ownership documentation review", desc: "Review available ownership documents." },
      { id: "mechanical",     label: "Mechanical inspection",          desc: "Coordinate mechanical inspection (third-party fee)." },
      { id: "history",        label: "Available history checks",       desc: "Run whatever history checks are accessible." },
      { id: "photos",         label: "Inspection photographs",         desc: "Capture dated photographic evidence." }
    ],
    equipment: [
      { id: "serial",         label: "Serial number & marks check",    desc: "Check serial numbers and identifying marks." },
      { id: "doc_review",     label: "Proof of ownership review",      desc: "Review proof of ownership and available records." },
      { id: "technical",      label: "Technical inspection",           desc: "Arrange technical inspection (third-party fee)." },
      { id: "condition",      label: "Condition & discrepancy report", desc: "Document condition and any discrepancies." },
      { id: "photos",         label: "Inspection photographs",         desc: "Capture dated photographic evidence." }
    ],
    other: [
      { id: "doc_review",     label: "Document review",                desc: "Review available ownership/ownership-related documents." },
      { id: "identity",       label: "Identity / marking check",       desc: "Verify identifying marks or serials." },
      { id: "inspection",     label: "Physical inspection",            desc: "Inspect the asset where practical." },
      { id: "photos",         label: "Inspection photographs",         desc: "Capture dated photographic evidence." }
    ]
  },

  /* -------- Service packages (Step 5). Fees are placeholders. -------- */
  packages: {
    land: [
      { id: "land_basic",    name: "Document Review",        baseFee: 75000,  days: "3–5 working days", items: ["Ownership document review", "Initial risk memo"] },
      { id: "land_standard", name: "Standard Verification",  baseFee: 150000, days: "5–10 working days", items: ["Document review", "Title search coordination", "Site visit + photos"] },
      { id: "land_full",     name: "Comprehensive",          baseFee: 250000, days: "10–15 working days", items: ["Everything in Standard", "Survey plan check", "Government records & encumbrance checks"] }
    ],
    house: [
      { id: "house_basic",    name: "Document Review",       baseFee: 85000,  days: "3–5 working days", items: ["Ownership & seller-authority review"] },
      { id: "house_standard", name: "Standard Verification", baseFee: 165000, days: "5–10 working days", items: ["Document review", "Title search", "Property inspection + photos"] },
      { id: "house_full",     name: "Comprehensive",         baseFee: 275000, days: "10–15 working days", items: ["Everything in Standard", "Occupation/tenancy check", "Building condition inspection (fee separation applies)"] }
    ],
    vehicle: [
      { id: "vehicle_basic",    name: "Identity Check",     baseFee: 45000,  days: "2–4 working days", items: ["Identity & registration check", "VIN/chassis inspection"] },
      { id: "vehicle_standard", name: "Standard",           baseFee: 80000,  days: "3–6 working days", items: ["Identity check", "Documentation review", "Mechanical inspection coordination"] },
      { id: "vehicle_full",     name: "Comprehensive",      baseFee: 120000, days: "5–8 working days", items: ["Everything in Standard", "Available history checks", "Detailed condition report"] }
    ],
    equipment: [
      { id: "equip_basic",    name: "Identity Check",  baseFee: 50000,  days: "3–5 working days", items: ["Serial number & marks check", "Proof of ownership review"] },
      { id: "equip_standard", name: "Standard",        baseFee: 90000,  days: "5–8 working days", items: ["Identity check", "Technical inspection coordination"] },
      { id: "equip_full",     name: "Comprehensive",   baseFee: 140000, days: "7–12 working days", items: ["Everything in Standard", "Condition & discrepancy report"] }
    ],
    other: [
      { id: "other_basic",    name: "Document Review", baseFee: 60000,  days: "3–5 working days", items: ["Document review", "Identity check"] },
      { id: "other_standard", name: "Standard",        baseFee: 100000, days: "5–10 working days", items: ["Document review", "Physical inspection"] }
    ]
  },

  /* -------- Workflow statuses -------- */
  statuses: [
    { id: "submitted",          label: "Submitted",                group: "submitted", badge: "badge--submitted" },
    { id: "awaiting_review",    label: "Awaiting Initial Review",  group: "submitted", badge: "badge--submitted" },
    { id: "awaiting_payment",   label: "Awaiting Payment",         group: "progress",  badge: "badge--progress" },
    { id: "awaiting_documents", label: "Awaiting Documents",       group: "progress",  badge: "badge--progress" },
    { id: "in_progress",        label: "Verification in Progress", group: "progress",  badge: "badge--progress" },
    { id: "awaiting_findings",  label: "Awaiting Professional Findings", group: "progress", badge: "badge--progress" },
    { id: "quality_review",     label: "Quality Review",           group: "progress",  badge: "badge--progress" },
    { id: "report_completed",   label: "Report Completed",         group: "done",      badge: "badge--done" },
    { id: "delivered",          label: "Delivered",                group: "done",      badge: "badge--done" },
    { id: "cancelled",          label: "Cancelled",                group: "cancel",    badge: "badge--cancel" }
  ],

  /* -------- Risk categories (report) -------- */
  riskLevels: [
    { id: "lower",       label: "Lower identified risk based on the checks completed", className: "badge--done" },
    { id: "caution",     label: "Caution: further checks or clarification required",    className: "badge--progress" },
    { id: "high",        label: "High concern: significant discrepancies or unresolved issues", className: "badge--cancel" },
    { id: "inconclusive",label: "Inconclusive: insufficient evidence to reach a reliable conclusion", className: "badge--neutral" }
  ],

  /* -------- Request form document types -------- */
  documentTypes: [
    { id: "survey_plan",   label: "Survey plan" },
    { id: "title_doc",     label: "Title / ownership document" },
    { id: "receipt",       label: "Receipt / payment record" },
    { id: "deed",          label: "Deed / agreement" },
    { id: "vehicle_doc",   label: "Vehicle registration / papers" },
    { id: "equipment_doc", label: "Equipment records / invoice" },
    { id: "id",            label: "Seller/agent ID or authority" },
    { id: "photo",         label: "Property / asset photo" },
    { id: "other",         label: "Other relevant document" }
  ],

  /* -------- Upload rules -------- */
  upload: {
    bucket: "verification-documents",
    maxFileMB: 10,
    maxFiles: 8,
    allowedMime: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    allowedExt: ["pdf", "jpg", "jpeg", "png", "webp"]
  },

  /* -------- Contact form -------- */
  contactEmail: "info@example.com",

  /* -------- Map (OpenStreetMap) default view: Port Harcourt -------- */
  map: {
    centreLat: 4.8156,
    centreLng: 7.0498,
    zoom: 11
  },

  /* -------- Demo mode sample data toggle -------- */
  demoMode: true
};
