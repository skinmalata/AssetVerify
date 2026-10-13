# Test Cases — AssetVerify Property Services

These are manual test cases you can run against **demo mode** (no setup) and, with
the Supabase values filled in, against the **live backend**. Mark each as
Pass/Fail and note anything unexpected.

Legend: **DM** = works in demo mode · **Live** = needs Supabase configured.

---

## A. Customer data isolation

| ID | Test | Steps | Expected |
|---|---|---|---|
| A1 | Customer sees only own requests | DM/Live · sign in as `customer@example.com`, open `dashboard.html` | Only that customer's requests are listed |
| A2 | Cannot read another customer's request | DM/Live · while signed in as customer A, open `dashboard.html?id=<customer B request id>` | No data shown ("not authorised") — in Live, RLS returns nothing |
| A3 | Guests cannot read requests | Live · signed out, attempt direct API select of `verification_requests` | Blocked by RLS (empty) |
| A4 | Tracking requires reference **and** email | DM/Live · `track.html` with correct ref but wrong email | "No request found" |
| A5 | Tracking shows only limited fields | Live · inspect `public_track_request` response | No documents, payments or internal notes returned |

## B. Administrator permissions

| ID | Test | Steps | Expected |
|---|---|---|---|
| B1 | Non-admin blocked from admin page | DM/Live · sign in as customer, open `admin.html` | Redirected to `dashboard.html` |
| B2 | Admin can access dashboard | sign in as `admin@example.com`, open `admin.html` | Stats, table and audit load |
| B3 | Self-promotion blocked | Live · as customer, attempt `insert into user_roles (role='admin')` for self | Blocked by RLS |
| B4 | Customer cannot update status | Live · as customer, attempt update on own request `status` | Blocked by RLS |
| B5 | Customer cannot alter findings/report | Live · as customer, attempt insert/update on `verification_reports` | Blocked by RLS |
| B6 | Customer cannot mark own invoice paid | Live · as customer, attempt insert into `payments` | Blocked by RLS |

## C. File security

| ID | Test | Steps | Expected |
|---|---|---|---|
| C1 | Disallowed file type rejected | `request.html` step 4 · upload a `.exe` or `.docx` | Inline error; file not added |
| C2 | Oversized file rejected | Upload a file > 10 MB | Inline error; file not added |
| C3 | Too many files rejected | Attempt > 8 files | Inline error |
| C4 | Documents are not public | Live · copy a storage object URL without a signed token | Access denied (private bucket) |
| C5 | Signed URL is short-lived | Live · open a document via portal, wait > 5 min, reload link | Link expired |
| C6 | Other users cannot read documents | Live · user B requests a signed URL for user A's object path | Denied (storage policy) |

## D. Form validation

| ID | Test | Steps | Expected |
|---|---|---|---|
| D1 | Required fields enforced per step | `request.html` · try to continue with blanks | Highlighted, blocked with message |
| D2 | Invalid email rejected | Enter `not-an-email` | Field error |
| D3 | Invalid phone rejected | Enter `abc` | Field error |
| D4 | At least one check required | Step 3 · continue with none selected | Blocked with message |
| D5 | Package or custom quote required | Step 5 · continue with no package and no custom quote | Blocked with message |
| D6 | Terms + consent required | Uncheck terms/consent | Blocked |
| D7 | Category drives checks | Change category from Land to Vehicle on step 2 | Step 3 shows vehicle checks |
| D8 | Price summary updates | Select different packages | Base, professional, third-party and total update |
| D9 | Review shows entered data | Reach step 6 | All details summarised correctly |
| D10 | Reference generated | Submit | Confirmation shows `AV-YYYY-NNNNNN` |

## E. Request workflow

| ID | Test | Steps | Expected |
|---|---|---|---|
| E1 | New request starts as "Submitted" | Submit then open admin | Status = Submitted, audit entry exists |
| E2 | Status transitions | Admin changes status through the workflow | Badge updates for customer |
| E3 | Progress updates visible/invisible | Add update with "visible" off, then on | Customer portal shows only visible ones |
| E4 | Quotation issued | Admin issues quote | Customer sees agreed price lines |
| E5 | Manual payment confirmed | Admin records payment | Payment row = confirmed; status advances |
| E6 | Awaiting documents | Admin sets "Awaiting documents" | Customer sees the status |
| E7 | Cancellation | Admin sets "Cancelled" | Badge = Cancelled |

## F. Report delivery

| ID | Test | Steps | Expected |
|---|---|---|---|
| F1 | Report hidden until published | Admin saves report with "Publish" off | Customer `report.html` shows "not released" |
| F2 | Report visible when published | Admin ticks "Publish" and saves | Customer can view and print |
| F3 | Report contains required sections | Open published report | Business info, reference, date, asset, objective, docs, checks, findings, unresolved, limitations, risk, next steps, contributors, reviewer, version |
| F4 | Risk category wording is cautious | Check risk labels | No guarantee/ownership claims |
| F5 | Version increments | Save the same report twice | Version becomes v2 (a snapshot is stored) |
| F6 | Print layout | Click Print / Save as PDF | Header/footer/buttons hidden; report clean |

## G. Payments

| ID | Test | Steps | Expected |
|---|---|---|---|
| G1 | Manual mode default | No gateway keys set | Bank-transfer instructions shown; no online payment required |
| G2 | Gateway is server-verified (if enabled) | Live · send a fake webhook without valid signature to `verify-payment` | 401 invalid signature; payment NOT confirmed |
| G3 | Browser cannot confirm payment | Attempt to set `payments.status='confirmed'` from client | Blocked |

## H. Email notifications

| ID | Test | Steps | Expected |
|---|---|---|---|
| H1 | Development fallback | Deploy `send-email` without `EMAIL_API_KEY`; submit request | Function returns `fallback: true`; message logged; site works |
| H2 | Real send (when configured) | Set `EMAIL_API_KEY`; submit request | Customer (and admin) receive acknowledgement |
| H3 | Secrets not exposed | View page source / network | No email or payment secret present in any browser-loaded file |

---

## Quick regression checklist
- [ ] All 13 public pages load with no console errors
- [ ] Header/footer links all work; active page highlighted
- [ ] Mobile menu opens/closes
- [ ] `request.html` full happy-path submission works (DM and Live)
- [ ] `login.html` demo accounts work; redirect to correct dashboard
- [ ] `dashboard.html` loads for customer; `admin.html` loads for admin only
- [ ] `report.html` prints cleanly
- [ ] Clear localStorage resets demo data
