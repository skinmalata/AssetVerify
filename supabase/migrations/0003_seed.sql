-- =============================================================================
-- AssetVerify Property Services — Migration 0003: Seed reference data
-- =============================================================================
-- Run AFTER 0002_rls.sql. Seeds asset categories and indicative packages.
-- These match assets/js/config.js so the frontend and database agree.
-- Update prices here as well as in config.js when you change them.
-- =============================================================================

insert into public.service_categories (id, label, icon, sort_order) values
  ('land',      'Land / Plot',            '🗺️', 1),
  ('house',     'House / Building',       '🏠', 2),
  ('vehicle',   'Vehicle',                '🚗', 3),
  ('equipment', 'Equipment / Machinery',  '⚙️', 4),
  ('other',     'Other Asset',            '📦', 5)
on conflict (id) do update
  set label = excluded.label, icon = excluded.icon, sort_order = excluded.sort_order;

insert into public.service_packages (id, category_id, name, base_fee, est_days, items, sort_order) values
  ('land_basic',    'land',      'Document Review',       75000,  '3–5 working days',  '["Ownership document review","Initial risk memo"]', 1),
  ('land_standard', 'land',      'Standard Verification', 150000, '5–10 working days', '["Document review","Title search coordination","Site visit + photos"]', 2),
  ('land_full',     'land',      'Comprehensive',         250000, '10–15 working days','["Everything in Standard","Survey plan check","Government records & encumbrance checks"]', 3),
  ('house_basic',    'house',    'Document Review',       85000,  '3–5 working days',  '["Ownership & seller-authority review"]', 1),
  ('house_standard', 'house',    'Standard Verification', 165000, '5–10 working days', '["Document review","Title search","Property inspection + photos"]', 2),
  ('house_full',     'house',    'Comprehensive',         275000, '10–15 working days','["Everything in Standard","Occupation/tenancy check","Building condition inspection (fee separation applies)"]', 3),
  ('vehicle_basic',    'vehicle','Identity Check',        45000,  '2–4 working days',  '["Identity & registration check","VIN/chassis inspection"]', 1),
  ('vehicle_standard', 'vehicle','Standard',              80000,  '3–6 working days',  '["Identity check","Documentation review","Mechanical inspection coordination"]', 2),
  ('vehicle_full',     'vehicle','Comprehensive',         120000, '5–8 working days',  '["Everything in Standard","Available history checks","Detailed condition report"]', 3),
  ('equip_basic',    'equipment','Identity Check',        50000,  '3–5 working days',  '["Serial number & marks check","Proof of ownership review"]', 1),
  ('equip_standard', 'equipment','Standard',              90000,  '5–8 working days',  '["Identity check","Technical inspection coordination"]', 2),
  ('equip_full',     'equipment','Comprehensive',         140000, '7–12 working days', '["Everything in Standard","Condition & discrepancy report"]', 3),
  ('other_basic',    'other',    'Document Review',       60000,  '3–5 working days',  '["Document review","Identity check"]', 1),
  ('other_standard', 'other',    'Standard',              100000, '5–10 working days', '["Document review","Physical inspection"]', 2)
on conflict (id) do update
  set category_id = excluded.category_id, name = excluded.name, base_fee = excluded.base_fee,
      est_days = excluded.est_days, items = excluded.items, sort_order = excluded.sort_order;

-- =============================================================================
-- MAKING AN ADMINISTRATOR (do this once, from the SQL editor as a project owner)
-- =============================================================================
-- 1. Sign up a normal account through the website (e.g. admin@yourcompany.com),
--    or create the user in Authentication > Users.
-- 2. Find its uuid:   select id, email from auth.users;
-- 3. Grant the admin role:
--      insert into public.user_roles (user_id, role)
--      values ('PASTE-THE-USER-UUID-HERE', 'admin')
--      on conflict (user_id, role) do nothing;
--
-- You may optionally remove the default 'customer' role for that user, but
-- keeping both is harmless. NEVER grant 'admin' to a public sign-up path.
-- =============================================================================
