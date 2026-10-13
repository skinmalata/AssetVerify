-- =============================================================================
-- AssetVerify Property Services — Migration 0002: Row Level Security + storage
-- =============================================================================
-- Run AFTER 0001_schema.sql.
--
-- Principle of least privilege:
--   * Public visitors can submit a request (via a SECURITY DEFINER function) and
--     track it by reference + email (via another function). They can read nothing
--     else.
--   * Customers can read only their own requests, documents, published reports,
--     payments and support messages, and may not change findings or status.
--   * Approved professionals can read only records tied to their assignments.
--   * Administrators can read/update operational data, proven by a role lookup,
--     never by anything the client claims about itself.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read the role table directly)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = 'admin'
  );
$$;

create or replace function public.owns_request(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.verification_requests q
    where q.id = p_request and q.user_id = auth.uid()
  );
$$;

create or replace function public.is_assigned(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.verification_assignments a
    where a.request_id = p_request and a.professional_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.user_roles               enable row level security;
alter table public.service_categories       enable row level security;
alter table public.service_packages         enable row level security;
alter table public.verification_requests    enable row level security;
alter table public.verification_documents   enable row level security;
alter table public.request_services         enable row level security;
alter table public.quotations               enable row level security;
alter table public.payments                 enable row level security;
alter table public.verification_assignments enable row level security;
alter table public.inspection_visits        enable row level security;
alter table public.verification_findings    enable row level security;
alter table public.verification_reports     enable row level security;
alter table public.report_versions          enable row level security;
alter table public.progress_updates         enable row level security;
alter table public.support_messages         enable row level security;
alter table public.audit_logs               enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- user_roles — a user may READ their own roles, but ONLY an admin may write.
-- This is what stops a customer promoting themselves to administrator.
-- -----------------------------------------------------------------------------
create policy "roles_select_own_or_admin" on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());
create policy "roles_admin_insert" on public.user_roles
  for insert with check (public.is_admin());
create policy "roles_admin_update" on public.user_roles
  for update using (public.is_admin()) with check (public.is_admin());
create policy "roles_admin_delete" on public.user_roles
  for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- service_categories / service_packages — public read of active rows, admin write
-- -----------------------------------------------------------------------------
create policy "categories_public_read" on public.service_categories
  for select using (active = true or public.is_admin());
create policy "categories_admin_write" on public.service_categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "packages_public_read" on public.service_packages
  for select using (active = true or public.is_admin());
create policy "packages_admin_write" on public.service_packages
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- verification_requests
--   Customers read their own; the assigned professional reads theirs; admin all.
--   Only admins update. Customers cannot alter status/findings.
--   Direct inserts are blocked for everyone except admins: the public form uses
--   the submit_verification_request() function instead (below).
-- -----------------------------------------------------------------------------
create policy "requests_select_own_admin_pro" on public.verification_requests
  for select using (user_id = auth.uid() or public.is_admin() or public.is_assigned(id));
create policy "requests_admin_insert" on public.verification_requests
  for insert with check (public.is_admin());
create policy "requests_admin_update" on public.verification_requests
  for update using (public.is_admin()) with check (public.is_admin());
create policy "requests_admin_delete" on public.verification_requests
  for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- verification_documents — owner, assigned professional, or admin
-- -----------------------------------------------------------------------------
create policy "documents_select" on public.verification_documents
  for select using (user_id = auth.uid() or public.is_admin() or public.is_assigned(request_id));
create policy "documents_insert_own_or_admin" on public.verification_documents
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "documents_admin_delete" on public.verification_documents
  for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- request_services — visible with the request; admin writes
-- -----------------------------------------------------------------------------
create policy "request_services_select" on public.request_services
  for select using (public.owns_request(request_id) or public.is_admin() or public.is_assigned(request_id));
create policy "request_services_admin_write" on public.request_services
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- quotations — owner reads; admin writes
-- -----------------------------------------------------------------------------
create policy "quotations_select" on public.quotations
  for select using (public.owns_request(request_id) or public.is_admin());
create policy "quotations_admin_write" on public.quotations
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- payments — owner reads; ONLY admin may write. A customer can never mark an
-- invoice paid. Online gateway confirmation must be done server-side.
-- -----------------------------------------------------------------------------
create policy "payments_select" on public.payments
  for select using (public.owns_request(request_id) or public.is_admin());
create policy "payments_admin_write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- verification_assignments / inspection_visits / verification_findings
-- -----------------------------------------------------------------------------
create policy "assignments_select" on public.verification_assignments
  for select using (public.is_admin() or professional_id = auth.uid() or public.owns_request(request_id));
create policy "assignments_admin_write" on public.verification_assignments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "visits_select" on public.inspection_visits
  for select using (public.is_admin() or public.is_assigned(request_id) or public.owns_request(request_id));
create policy "visits_admin_write" on public.inspection_visits
  for all using (public.is_admin()) with check (public.is_admin());

create policy "findings_select" on public.verification_findings
  for select using (public.is_admin() or public.is_assigned(request_id));
create policy "findings_admin_write" on public.verification_findings
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- verification_reports — customers see ONLY released reports; admin all.
-- -----------------------------------------------------------------------------
create policy "reports_select" on public.verification_reports
  for select using (
    public.is_admin()
    or (published = true and public.owns_request(request_id))
  );
create policy "reports_admin_write" on public.verification_reports
  for all using (public.is_admin()) with check (public.is_admin());

create policy "report_versions_admin" on public.report_versions
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- progress_updates — customers see only customer-visible updates; admin all.
-- -----------------------------------------------------------------------------
create policy "progress_select" on public.progress_updates
  for select using (
    public.is_admin()
    or (visible_to_customer = true and public.owns_request(request_id))
    or public.is_assigned(request_id)
  );
create policy "progress_admin_write" on public.progress_updates
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- support_messages — owner reads own thread; owner may post as customer; admin.
-- -----------------------------------------------------------------------------
create policy "support_select" on public.support_messages
  for select using (public.owns_request(request_id) or public.is_admin());
create policy "support_insert_customer" on public.support_messages
  for insert with check (
    (public.owns_request(request_id) and from_customer = true and user_id = auth.uid())
    or public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- audit_logs — admin read only. Regular inserts come from triggers/functions.
-- -----------------------------------------------------------------------------
create policy "audit_admin_read" on public.audit_logs
  for select using (public.is_admin());
create policy "audit_admin_insert" on public.audit_logs
  for insert with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Public RPC: submit a request (works for guests and signed-in users)
-- -----------------------------------------------------------------------------
create or replace function public.submit_verification_request(payload jsonb)
returns table (id uuid, reference text)
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  ref text;
  uid uuid := auth.uid();
begin
  -- Basic server-side validation
  if coalesce(trim(payload->>'customer_name'), '') = '' then
    raise exception 'customer_name is required';
  end if;
  if coalesce(trim(payload->>'email'), '') = '' then
    raise exception 'email is required';
  end if;
  if coalesce(payload->>'terms_accepted', 'false')::boolean is not true then
    raise exception 'terms must be accepted';
  end if;

  ref := 'AV-' || to_char(now(), 'YYYY') || '-' ||
         lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');

  insert into public.verification_requests (
    reference, user_id, customer_name, email, phone, preferred_contact, country,
    buying_remote, category, asset_title, state, lga, town, address, gps,
    asking_price, currency, seller_contact, intended_purchase_date, checks,
    package_id, base_fee, professional_fees, third_party_fees, total_fee,
    custom_quote, terms_accepted, consent_processing, status
  ) values (
    ref, uid,
    payload->>'customer_name', payload->>'email', payload->>'phone',
    nullif(payload->>'preferred_contact',''), payload->>'country',
    nullif(payload->>'buying_remote',''), payload->>'category', payload->>'asset_title',
    payload->>'state', payload->>'lga', payload->>'town', payload->>'address', payload->>'gps',
    nullif(payload->>'asking_price','')::numeric, coalesce(payload->>'currency','NGN'),
    payload->>'seller_contact',
    nullif(payload->>'intended_purchase_date','')::date,
    coalesce(payload->'checks', '[]'::jsonb),
    nullif(payload->>'package_id',''),
    coalesce((payload->>'base_fee')::numeric, 0),
    coalesce((payload->>'professional_fees')::numeric, 0),
    coalesce((payload->>'third_party_fees')::numeric, 0),
    coalesce((payload->>'total_fee')::numeric, 0),
    coalesce((payload->>'custom_quote')::boolean, false),
    true, coalesce((payload->>'consent_processing')::boolean, false),
    'submitted'
  ) returning verification_requests.id into new_id;

  insert into public.request_services (request_id, check_id)
  select new_id, value from jsonb_array_elements_text(coalesce(payload->'checks','[]'::jsonb));

  insert into public.progress_updates (request_id, message, visible_to_customer)
  values (new_id, 'Request received and queued for initial review.', true);

  return query select new_id, ref;
end;
$$;
grant execute on function public.submit_verification_request(jsonb) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Public RPC: track a request by reference + email (returns limited fields only)
-- -----------------------------------------------------------------------------
create or replace function public.public_track_request(p_reference text, p_email text)
returns table (reference text, status text, category text, asset_title text,
               state text, lga text, town text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.reference, r.status, r.category, r.asset_title, r.state, r.lga, r.town,
         r.created_at, r.updated_at
  from public.verification_requests r
  where lower(r.reference) = lower(p_reference)
    and lower(r.email) = lower(p_email)
  limit 1;
$$;
grant execute on function public.public_track_request(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: private bucket for documents + folder-scoped policies
-- Path convention: <user_id>/<request_id>/<timestamp>-<filename>
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

create policy "docs_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "docs_storage_select_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "docs_storage_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verification-documents' and public.is_admin());
