# AssetVerify Property Services — Website & Verification Platform

A complete, responsive property & asset verification web application for a business
operating in **Port Harcourt, Rivers State, Nigeria**, with plans to expand across
Nigeria.

It helps buyers verify **land, houses, vehicles, machinery/equipment and other
assets** before purchasing, reducing the risk of fraud, disputed ownership, fake
documentation and undisclosed defects.

> **Honest scope:** This is an independent private due-diligence service. It is not
> a government agency, does not issue official certificates, and does not guarantee
> ownership or eliminate fraud. The site says so plainly, and so should you.

---

## 1. What's included

| Area | What you get |
|---|---|
| **Public site (13 pages)** | Home, About, Services, How It Works, Pricing, Request, Track, Contact, FAQ, Privacy, Terms, Limitations & Disclaimers, Login/Register |
| **Multi-step request form** | 6 steps with per-step validation, dynamic checks per asset type, document upload with type/size validation, live price summary, review & unique reference number |
| **Customer portal** | View requests, statuses, agreed price, progress updates, documents, released reports, invoices/payments and support messages |
| **Admin dashboard** | Stats, revenue/outstanding, search & filters, request detail, status workflow, progress updates, quotations, manual payment confirmation, report editor/publisher, support, audit log |
| **Verification reports** | Print-friendly, downloadable (browser "Save as PDF"), with risk categories, findings, unresolved issues and limitations |
| **Security** | Supabase Auth, Row Level Security, private storage, secure RPCs, role-based permissions, audit logging |
| **Database** | Full Supabase schema + RLS policies + seed data (SQL migrations) |
| **Email** | Server-side Edge Function with 9 templates and a working development fallback |
| **Payments** | Manual bank-transfer mode by default, structured for Paystack/Flutterwave later (server-side verification only) |

**Zero-cost by default:** the core experience uses free tiers only (GitHub Pages
or Render static hosting + Supabase free tier). No paid APIs are required.

---

## 2. Tech stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript (no frameworks, no build step)
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **File storage:** Supabase Storage (private bucket)
- **Server logic:** Supabase Edge Functions (Deno)
- **Maps:** OpenStreetMap-compatible links
- **Hosting:** GitHub Pages (static) — Render static sites also work
- **Version control:** Git & GitHub

---

## 3. Project structure

```
.
├─ index.html                 # Home
├─ about.html  services.html  how-it-works.html  pricing.html  faq.html
├─ contact.html  privacy.html  terms.html  disclaimer.html
├─ login.html  register.html  reset-password.html
├─ request.html               # Multi-step verification request
├─ track.html                 # Public request tracking
├─ dashboard.html             # Customer portal
├─ admin.html                 # Admin dashboard (protected)
├─ report.html                # Print-friendly report (protected)
├─ robots.txt  sitemap.xml  .nojekyll
├─ assets/
│  ├─ css/styles.css          # One shared stylesheet (change tokens to rebrand)
│  └─ js/
│     ├─ config.js            # Brand, Supabase public keys, prices, packages
│     ├─ api.js               # Data layer (Supabase OR localStorage demo mode)
│     ├─ common.js            # Header, footer, badges, helpers, navigation
│     ├─ demo-data.js         # Fictional sample records for demo mode
│     ├─ faq-data.js          # Shared FAQ content
│     └─ request-form.js      # Multi-step form logic
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_schema.sql      # Tables, keys, indexes, triggers
│  │  ├─ 0002_rls.sql         # Row Level Security + storage policies + RPCs
│  │  └─ 0003_seed.sql        # Categories, packages, admin instructions
│  └─ functions/
│     ├─ send-email/index.ts  # Transactional email (dev fallback built in)
│     └─ verify-payment/index.ts # Optional Paystack server-side verification
├─ docs/TESTING.md            # Test cases (access, permissions, security, forms)
├─ .env.example               # Environment variable placeholders
└─ README.md
```

---

## 4. Quick start — try it in DEMO MODE (no setup)

Because `assets/js/config.js` ships with **no Supabase keys**, the whole site runs
in **demo mode** using fictional sample data stored in your browser.

1. Open `index.html` in a browser (or run a local server — see below).
2. Explore every page, submit a request, log in with the demo accounts:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@example.com` | `admin123` |
| Customer | `customer@example.com` | `customer123` |

Demo records are **fictional** and clearly labelled. To reset demo data, clear your
browser's localStorage for the site.

**Recommended local server** (so the Edge Functions/CDN and file paths behave like
production):

```powershell
# Python (usually pre-installed)
python -m http.server 8080
# then open http://localhost:8080
```

---

## 5. Connect the real backend (Supabase)

### 5.1 Create a project
1. Sign up at <https://supabase.com> (free tier).
2. Create a new project. Note your **Project URL** and **anon (public) key**
   (Project Settings → API). The anon key is safe for the browser **because RLS
   protects your data**.

### 5.2 Run the database migrations
In the Supabase dashboard → **SQL Editor**, run these three files **in order**:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_seed.sql`

(Or, with the Supabase CLI: `supabase db push`.)

This creates all tables, indexes, triggers, the private `verification-documents`
storage bucket, Row Level Security policies and the seed categories/packages.

### 5.3 Create your first administrator
1. Register an account through `register.html` (e.g. `admin@yourcompany.com`).
2. In SQL Editor find its id: `select id, email from auth.users;`
3. Grant the role:
   ```sql
   insert into public.user_roles (user_id, role)
   values ('PASTE-THE-USER-UUID', 'admin')
   on conflict (user_id, role) do nothing;
   ```

Customers can never do this themselves — RLS only allows admins to write to
`user_roles`.

### 5.4 Point the frontend at Supabase
Edit **`assets/js/config.js`** and fill in **only** these two public values:

```js
supabase: {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR_PUBLIC_ANON_KEY"
}
```

Also open `assets/js/config.js` → `brand` and set your real business name,
email, phone, address and `contactEmail`. Update `packages` prices to match your
real prices (and mirror them in `0003_seed.sql` if you like).

**Never** put the service-role key or any email/payment secret in `config.js`.

### 5.5 (Optional) Deploy the Edge Functions
Install the Supabase CLI, then from the project root:

```powershell
supabase login
supabase link --project-ref YOUR-PROJECT-REF

# Email (set your own provider key; Resend free tier works)
supabase secrets set EMAIL_PROVIDER=resend EMAIL_API_KEY=re_xxx `
  EMAIL_FROM="AssetVerify <no-reply@yourdomain>" ADMIN_NOTIFICATION_EMAIL=you@yourdomain
supabase functions deploy send-email

# Optional payment (only if/when you enable an online gateway)
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
supabase functions deploy verify-payment --no-verify-jwt
```

If `EMAIL_API_KEY` is **not** set, `send-email` still works in **development
fallback** mode: it logs the message instead of sending, and the app continues to
function normally. This is intentional and documented.

### 5.6 Email, authentication URLs
In Supabase → Authentication → URL Configuration, set your **Site URL** to your
deployed URL and add the same domain to **Redirect URLs** so password-reset links
return to `reset-password.html`.

---

## 6. Deploy the website (free options)

### Option A — GitHub Pages (recommended, free)
1. Create a repository and push this project:
   ```powershell
   git init
   git add .
   git commit -m "Initial AssetVerify site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/assetverify.git
   git push -u origin main
   ```
2. In GitHub → **Settings → Pages**, set **Source: Deploy from a branch**, branch
   `main`, folder `/ (root)`. Save.
3. Your site appears at `https://YOUR-USERNAME.github.io/assetverify/`.
4. Update the placeholder URLs in `robots.txt`, `sitemap.xml` and each page's
   `<link rel="canonical">` / Open Graph tags. Add your domain to Supabase's
   Redirect URLs (step 5.6).

> Because `.nojekyll` is included, GitHub Pages serves every file as-is.

### Option B — Render (static site, free tier where available)
- New → **Static Site** → connect the repo → **Build Command:** *(leave blank)* →
  **Publish Directory:** `.`. Check Render's current free-tier terms before relying
  on it. See <https://render.com/docs/static-sites>.

---

## 7. Environment variables

See **`.env.example`**. Summary:

| Variable | Where it's used | Secret? |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | browser (`config.js`) | No (public, RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only | **Yes** |
| `EMAIL_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` | `send-email` function | **Yes** |
| `PAYSTACK_SECRET_KEY` | `verify-payment` function | **Yes** |

Rule of thumb: **anything in `assets/` is public. Secrets live only in Edge
Function secrets.**

---

## 8. Security model (read this)

- **Row Level Security is the real gate.** The browser holds only the anon key;
  every table has RLS policies that decide what that key can read/write.
- **Public submission** goes through a `SECURITY DEFINER` function
  (`submit_verification_request`) that validates input server-side and generates
  the reference. Direct inserts are blocked for non-admins.
- **Public tracking** uses `public_track_request(reference, email)` which returns
  only a handful of non-sensitive fields.
- **Documents** live in a private bucket; the path is namespaced by user id and
  storage policies allow owners (and admins) only. Downloads use short-lived
  signed URLs (5-minute expiry) generated in `api.js`.
- **Customers cannot** change status, findings, payments or reports — RLS blocks
  those writes.
- **Admins cannot be self-promoted** — only admins may write to `user_roles`.
- **Audit logging** records request submission (trigger) and admin actions.
- **Payments** are only ever marked paid by an authorised admin, or by a
  server-side, signature-verified webhook — never because the browser said so.

---

## 9. What needs external credentials / is not fully implemented

This project is deliberately honest about its boundaries:

| Item | Status |
|---|---|
| Supabase database, auth, storage, RLS | **Fully implemented** — needs your project keys |
| Public pages, request form, portal, admin, reports | **Fully implemented** |
| Transactional email | Implemented; **requires an email provider key**. Without it, development fallback logs instead of sending |
| Online payments (Paystack/Flutterwave) | **Not enabled by default.** Manual bank transfer works now; server-side verification scaffolding provided in `verify-payment`. **Not tested against a live gateway** |
| PDF export | Uses the browser's print-to-PDF (free, no backend). A server-side PDF library could be added later |
| Interactive map | Uses an OpenStreetMap link (no API key). An embedded tile map can be added if desired |
| AI/history checks for vehicles | Only "available" checks; depends on accessible data sources |
| Automated test runner | No paid CI assumed; test **cases** are documented in `docs/TESTING.md` for manual execution |

**No fabricated data:** sample records are fictional and labelled; no real
customers, transactions, registry results or certificates are represented.

---

## 10. Testing

See **`docs/TESTING.md`** for concrete test cases covering: customer data
isolation, admin-only permissions, file-type/size security, private-document
access, form validation, the request workflow, report release and payment
handling.

---

## 11. Customising & maintaining (for beginners)

- **Brand name, logo text, phone, email, address, hours:** `assets/js/config.js`
  → `brand`. The header/footer update automatically.
- **Colours:** `assets/css/styles.css` → the `:root` variables at the top
  (`--navy-*`, `--gold-*`, `--teal-*`).
- **Prices & packages:** `assets/js/config.js` → `packages` (and optionally the SQL
  seed file).
- **Checks offered per asset type:** `assets/js/config.js` → `checksByCategory`.
- **Statuses & risk categories:** `assets/js/config.js` → `statuses`,
  `riskLevels` (and the `CHECK` constraints in `0001_schema.sql`).
- **FAQ:** `assets/js/faq-data.js`.
- **Legal pages:** edit the HTML directly. **Have a qualified Nigerian legal
  practitioner review `privacy.html`, `terms.html` and `disclaimer.html`** — they
  are templates, not legal advice.

Every page loads the same shared scripts in this order:
`supabase-js` → `config.js` → `demo-data.js` → `api.js` → `common.js` → *(page script)*.

---

## 12. License & disclaimer

Provided as a starting template for your business. The legal pages and the
limitations wording are **templates** and must be reviewed by a qualified legal
practitioner. The software is provided "as is", without warranty.
