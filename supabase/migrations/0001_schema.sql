-- =============================================================================
-- AssetVerify Property Services — Migration 0001: Database schema
-- =============================================================================
-- Run this in the Supabase SQL editor (or `supabase db push`) BEFORE 0002_rls.
-- All tables use UUID primary keys. Timestamps are stored in UTC (timestamptz).
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — one row per authenticated user (public-facing profile)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  country     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatically create a profile (and default role) when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'country', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- user_roles — role-based permissions. NEVER let a user insert/update their own
-- role to 'admin' via the client; enforced in RLS (0002) + this guard trigger.
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('customer', 'professional', 'admin')),
  created_at  timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists idx_user_roles_user on public.user_roles(user_id);

-- -----------------------------------------------------------------------------
-- service_categories — configurable asset categories (land, house, …)
-- -----------------------------------------------------------------------------
create table if not exists public.service_categories (
  id          text primary key,
  label       text not null,
  icon        text,
  active      boolean not null default true,
  sort_order  int not null default 0
);

-- -----------------------------------------------------------------------------
-- service_packages — pricing packages per category
-- -----------------------------------------------------------------------------
create table if not exists public.service_packages (
  id            text primary key,
  category_id   text not null references public.service_categories(id) on delete cascade,
  name          text not null,
  base_fee      numeric(14,2) not null default 0 check (base_fee >= 0),
  est_days      text,
  items         jsonb not null default '[]'::jsonb,
  active        boolean not null default true,
  sort_order    int not null default 0
);
create index if not exists idx_service_packages_cat on public.service_packages(category_id);

-- -----------------------------------------------------------------------------
-- verification_requests — the core request record
-- -----------------------------------------------------------------------------
create table if not exists public.verification_requests (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null unique,
  user_id                 uuid references auth.users(id) on delete set null,
  customer_name           text not null,
  email                   text not null,
  phone                   text,
  preferred_contact       text check (preferred_contact in ('email','phone','whatsapp')),
  country                 text,
  buying_remote           text check (buying_remote in ('locally','remotely')),
  category                text not null references public.service_categories(id),
  asset_title             text not null,
  state                   text,
  lga                     text,
  town                    text,
  address                 text,
  gps                     text,
  asking_price            numeric(16,2),
  currency                text not null default 'NGN' check (currency in ('NGN','USD')),
  seller_contact          text,
  intended_purchase_date  date,
  checks                  jsonb not null default '[]'::jsonb,
  package_id              text references public.service_packages(id),
  base_fee                numeric(14,2) not null default 0,
  professional_fees       numeric(14,2) not null default 0,
  third_party_fees        numeric(14,2) not null default 0,
  total_fee               numeric(14,2) not null default 0,
  custom_quote            boolean not null default false,
  terms_accepted          boolean not null default false,
  consent_processing      boolean not null default false,
  status                  text not null default 'submitted'
    check (status in ('submitted','awaiting_review','awaiting_payment','awaiting_documents',
                      'in_progress','awaiting_findings','quality_review','report_completed',
                      'delivered','cancelled')),
  risk_level              text check (risk_level in ('lower','caution','high','inconclusive')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_requests_user on public.verification_requests(user_id);
create index if not exists idx_requests_status on public.verification_requests(status);
create index if not exists idx_requests_category on public.verification_requests(category);
create index if not exists idx_requests_reference on public.verification_requests(reference);
create trigger trg_requests_updated before update on public.verification_requests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- verification_documents — metadata for files stored in private Storage
-- -----------------------------------------------------------------------------
create table if not exists public.verification_documents (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.verification_requests(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  doc_type    text not null default 'other',
  filename    text not null,
  path        text not null,
  size        bigint,
  created_at  timestamptz not null default now()
);
create index if not exists idx_documents_request on public.verification_documents(request_id);

-- -----------------------------------------------------------------------------
-- request_services — normalised list of checks selected on a request
-- -----------------------------------------------------------------------------
create table if not exists public.request_services (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.verification_requests(id) on delete cascade,
  check_id    text not null,
  label       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_request_services_request on public.request_services(request_id);

-- -----------------------------------------------------------------------------
-- quotations
-- -----------------------------------------------------------------------------
create table if not exists public.quotations (
  id                  uuid primary key default gen_random_uuid(),
  request_id          uuid not null references public.verification_requests(id) on delete cascade,
  base_fee            numeric(14,2) not null default 0,
  professional_fees   numeric(14,2) not null default 0,
  third_party_fees    numeric(14,2) not null default 0,
  total               numeric(14,2) not null default 0,
  notes               text,
  status              text not null default 'issued' check (status in ('draft','issued','accepted','declined')),
  created_at          timestamptz not null default now()
);
create index if not exists idx_quotations_request on public.quotations(request_id);

-- -----------------------------------------------------------------------------
-- payments — manual by default; may be completed by a verified webhook later
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.verification_requests(id) on delete cascade,
  amount        numeric(14,2) not null default 0,
  currency      text not null default 'NGN' check (currency in ('NGN','USD')),
  status        text not null default 'pending' check (status in ('pending','confirmed','failed','refunded')),
  method        text default 'bank_transfer',
  reference     text,
  confirmed_at  timestamptz,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_payments_request on public.payments(request_id);

-- -----------------------------------------------------------------------------
-- verification_assignments — jobs assigned to approved professionals
-- -----------------------------------------------------------------------------
create table if not exists public.verification_assignments (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references public.verification_requests(id) on delete cascade,
  professional_id    uuid references auth.users(id) on delete set null,
  professional_name  text,
  duty               text,
  status             text not null default 'assigned' check (status in ('assigned','accepted','declined','completed')),
  assigned_at        timestamptz not null default now()
);
create index if not exists idx_assignments_request on public.verification_assignments(request_id);
create index if not exists idx_assignments_pro on public.verification_assignments(professional_id);

-- -----------------------------------------------------------------------------
-- inspection_visits
-- -----------------------------------------------------------------------------
create table if not exists public.inspection_visits (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.verification_requests(id) on delete cascade,
  scheduled_at  timestamptz,
  completed_at  timestamptz,
  inspector     text,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_visits_request on public.inspection_visits(request_id);

-- -----------------------------------------------------------------------------
-- verification_findings — individual findings with their source
-- -----------------------------------------------------------------------------
create table if not exists public.verification_findings (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.verification_requests(id) on delete cascade,
  source       text,
  category     text,
  description  text not null,
  severity     text check (severity in ('info','caution','high')),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_findings_request on public.verification_findings(request_id);

-- -----------------------------------------------------------------------------
-- verification_reports — the released report (one current row per request)
-- -----------------------------------------------------------------------------
create table if not exists public.verification_reports (
  id                  uuid primary key default gen_random_uuid(),
  request_id          uuid not null unique references public.verification_requests(id) on delete cascade,
  reference           text,
  risk_level          text check (risk_level in ('lower','caution','high','inconclusive')),
  summary             text,
  documents_received  text,
  checks_performed    text,
  findings            text,
  unresolved          text,
  limitations         text,
  next_steps          text,
  contributors        text,
  reviewer            text,
  version             int not null default 1,
  published           boolean not null default false,
  issued_at           timestamptz,
  updated_at          timestamptz not null default now()
);
create trigger trg_reports_updated before update on public.verification_reports
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- report_versions — immutable snapshots for revision history
-- -----------------------------------------------------------------------------
create table if not exists public.report_versions (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.verification_reports(id) on delete cascade,
  version     int not null,
  snapshot    jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_report_versions_report on public.report_versions(report_id);

-- -----------------------------------------------------------------------------
-- progress_updates — customer-visible or internal notes
-- -----------------------------------------------------------------------------
create table if not exists public.progress_updates (
  id                  uuid primary key default gen_random_uuid(),
  request_id          uuid not null references public.verification_requests(id) on delete cascade,
  message             text not null,
  visible_to_customer boolean not null default true,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_progress_request on public.progress_updates(request_id);

-- -----------------------------------------------------------------------------
-- support_messages — customer <-> admin thread per request
-- -----------------------------------------------------------------------------
create table if not exists public.support_messages (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.verification_requests(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  from_customer boolean not null default true,
  message       text not null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_support_request on public.support_messages(request_id);

-- -----------------------------------------------------------------------------
-- audit_logs — significant actions. Inserted by admins and by triggers.
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor       text,
  action      text not null,
  entity      text,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_created on public.audit_logs(created_at);

-- Log every new request automatically.
create or replace function public.log_request_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor, action, entity, detail)
  values (coalesce(new.user_id::text, 'guest'), 'request_submitted', 'request:' || new.id, new.reference);
  return new;
end;
$$;
create trigger trg_audit_request_created
  after insert on public.verification_requests
  for each row execute function public.log_request_submitted();
