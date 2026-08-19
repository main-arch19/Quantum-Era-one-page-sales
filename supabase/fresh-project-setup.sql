-- ═══════════════════════════════════════════════════════════════════════════
-- QES — ONE-TIME SETUP FOR A FRESH SUPABASE PROJECT
--
-- Paste this whole file into the Supabase SQL Editor and press Run. Once.
--
-- WHY THIS FILE EXISTS
-- The schema lives in two files for historical reasons: schema.sql built the
-- original single-table lead capture, and crm-migration.sql later turned that
-- into the CRM. crm-migration.sql opens by renaming public.leads aside, and
-- that statement is UNGUARDED — on a brand-new project there is no table to
-- rename, so it errors and its transaction rolls back. The file is not
-- broken; it simply assumes the first one already ran.
--
-- Rather than have anyone remember that at 11pm, this concatenates the two in
-- the correct order. Generated from:
--   1. Quantum Era google ads landing page/supabase/schema.sql
--   2. QES CRM/supabase/crm-migration.sql
--
-- Those two remain the source of truth. If either changes, regenerate this
-- rather than editing it by hand — a third copy of a schema is how the three
-- of them drift apart.
--
-- SAFE TO RUN TWICE: part one is idempotent, and part two aborts loudly if it
-- has already been applied rather than corrupting anything.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- PART 1 of 2 — the base table
-- ───────────────────────────────────────────────────────────────────────────

-- QES landing page — database schema.
--
-- Run this once against your Supabase project (SQL Editor, or psql).
-- It is written to be re-runnable: every statement is guarded.
--
-- ONE TABLE. Do not add a bookings table.
--
-- A booking is not an entity here, it is a fact about a lead — so it is a
-- nullable column on the lead. The reason is the query that pays for this
-- page: `where booked_at is null` returns everybody who ran the audit, saw
-- what their site was doing, handed over an email, and then did not book.
-- That is the highest-value follow-up list this page produces, and splitting
-- it across two tables turns it into a left join that nobody remembers to
-- write correctly.

create table if not exists public.leads (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),

  -- Stage 2, the email gate.
  name               text        not null,
  email              text        not null,
  company            text        not null,

  -- Stage 1. Stored as the URL we actually ended on after redirects, not the
  -- string that was typed — that is the site we really audited.
  website_url        text        not null,

  -- The full AuditResult, free findings and gated findings together.
  audit              jsonb,

  -- utm_source / utm_medium / utm_campaign / utm_term / utm_content / gclid.
  utm                jsonb,

  -- NULL until Calendly's invitee.created webhook says otherwise.
  booked_at          timestamptz,
  calendly_event_uri text
);

-- The follow-up segment, indexed. Partial so it stays small and stays fast
-- as the booked rows accumulate.
create index if not exists leads_unbooked_idx
  on public.leads (created_at desc)
  where booked_at is null;

-- The webhook joins on id, which is already the primary key. Email is indexed
-- separately only for human lookup — never join on it, because the visitor can
-- edit their email inside the Calendly widget and a join on it breaks silently.
create index if not exists leads_email_idx on public.leads (email);

-- ── Row level security ──────────────────────────────────────────────────────
-- Nothing reaches this table except the server, using the service role key,
-- which bypasses RLS. Enabling it with no policies therefore costs nothing and
-- means an accidentally-leaked anon key still reads nothing.
alter table public.leads enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION — enquiry form replaces the URL audit.
--
-- RUN THIS against an existing project. The table was created when the page
-- captured a website URL and a company name and required both; the enquiry
-- form collects neither, so without these four statements EVERY submission
-- fails at insert on a not-null violation and the lead is lost.
--
-- Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.leads alter column company     drop not null;
alter table public.leads alter column website_url drop not null;

-- Optional on the form, so nullable here.
alter table public.leads add column if not exists phone text;

-- Required on the form. Left nullable in the database on purpose: rows written
-- before this change have no description, and a not-null column would refuse
-- to be added to a table that already has rows.
alter table public.leads add column if not exists project_description text;

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION — the exit offer.
--
-- A visitor who is leaving without submitting gets one modal offering 10% off
-- setup for three fields. That writes an ordinary lead row through the same
-- insert_lead_with_activity RPC, then tags it with these two columns in a
-- second statement — the RPC's signature is owned by the QESCRM repo and is
-- not widened from here.
--
-- Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

-- NOT NULL with a default is safe on an existing table: every prior row is a
-- full enquiry, which is exactly what false means. Querying "who claimed a
-- discount" then never has to reason about nulls.
alter table public.leads
  add column if not exists discount_claimed boolean not null default false;

-- The code as issued, not as a boolean. If the offer is ever re-run at a
-- different rate, rows written under the old one must still say which deal
-- they were actually promised — that is the number we have to honour.
alter table public.leads add column if not exists discount_code text;

-- The list somebody has to work: claimed the discount, never booked a call.
-- Partial for the same reason leads_unbooked_idx is — it stays small.
create index if not exists leads_discount_unbooked_idx
  on public.leads (created_at desc)
  where discount_claimed and booked_at is null;


-- ───────────────────────────────────────────────────────────────────────────
-- PART 2 of 2 — the CRM schema
-- ───────────────────────────────────────────────────────────────────────────

-- QES Internal CRM — schema migration.
--
-- Turns the flat single-table lead capture into a pipeline: ownership,
-- status, an append-only activity log, and a follow-up sequence with a
-- send ledger.
--
-- RUN ONCE, as a single transaction, against the Supabase project the
-- landing page already writes to. Not re-runnable by design — it renames a
-- live table, and a guard at the top aborts if it has already been applied.
--
-- ORDER MATTERS. Run this, then deploy the landing page changes
-- immediately. Between the two, an insert from the live form fails on the
-- changed column shape. That is survivable and already handled: the server
-- action logs the whole lead payload and still sends the Resend email, so a
-- lead in that window is recoverable by hand rather than lost. Run it at
-- low traffic anyway.

begin;

-- ── Guard ───────────────────────────────────────────────────────────────────
-- Applying this twice would rename the NEW table to leads_legacy and destroy
-- the mapping between the two. Refuse loudly instead.
do $$
begin
  if to_regclass('public.leads_legacy') is not null then
    raise exception
      'Already migrated: public.leads_legacy exists. Refusing to run again.';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Move the existing table aside.
--
-- Renaming a table does NOT rename its indexes or constraints, so leads_pkey
-- would still be occupied when the new table tries to claim it. Rename them
-- explicitly or the create below fails on a duplicate relation.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.leads rename to leads_legacy;

-- The primary key always exists. The other two were created with
-- `if not exists` in schema.sql, so rename them only if they are actually
-- there — a project whose table was built by hand may have neither, and an
-- error here would abort a migration that is otherwise fine.
alter index public.leads_pkey rename to leads_legacy_pkey;

do $$
begin
  if to_regclass('public.leads_unbooked_idx') is not null then
    execute 'alter index public.leads_unbooked_idx rename to leads_legacy_unbooked_idx';
  end if;
  if to_regclass('public.leads_email_idx') is not null then
    execute 'alter index public.leads_email_idx rename to leads_legacy_email_idx';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Types
-- ─────────────────────────────────────────────────────────────────────────────

create type user_role     as enum ('admin','rep');
create type lead_status   as enum ('new','contacted','replied','booked','won','lost');
create type activity_type as enum ('note','status_change','email_sent','call','booking','assignment');


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  role       user_role not null default 'rep',
  created_at timestamptz not null default now()
);

create table public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  name          text not null,
  email         text not null,
  phone         text,
  company       text,

  -- Nullable. The enquiry form does not collect it. Kept for the legacy rows
  -- that have one, and in case the URL audit ever comes back.
  website_url   text,

  -- The qualifying field, and now the most valuable text on a lead. It is
  -- what the follow-up sequence has to work with.
  project_description text,

  -- Nullable and unpopulated. The audit stopped running in commit 3fcc68e
  -- when the URL gate was replaced by a plain enquiry form. The columns exist
  -- so that bringing it back is a write, not another migration.
  audit_score   int,
  audit_results jsonb,

  -- Split out of the old `utm` jsonb so they can be filtered and indexed.
  -- gclid is here despite not being a utm_ param because it is the thing that
  -- actually ties a lead back to a paid click.
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  gclid         text,

  status        lead_status not null default 'new',
  owner_id      uuid references public.profiles(id) on delete set null,

  booked_at          timestamptz,
  calendly_event_uri text,

  -- NULL means the sequence is over: either they booked, or all three emails
  -- have gone. See the follow-up cron.
  next_touch_at timestamptz,
  touch_count   int not null default 0,

  notes         text
);

-- Append-only. There are deliberately no update or delete policies below.
create table public.activities (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  type       activity_type not null,
  body       text,
  created_at timestamptz not null default now()
);

-- The idempotency ledger for the follow-up cron.
--
-- The unique constraint is the whole point. The cron WILL run twice
-- eventually — a redeploy, a platform retry, a function timeout — and this
-- makes a duplicate send physically impossible rather than merely unlikely.
-- Rows are written BEFORE the Resend call, never after.
create table public.email_sends (
  id       uuid primary key default gen_random_uuid(),
  lead_id  uuid not null references public.leads(id) on delete cascade,
  template text not null,
  sent_at  timestamptz not null default now(),
  unique (lead_id, template)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Backfill
--
-- Every legacy row comes across. utm jsonb splits into columns.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.leads (
  id, created_at, updated_at, name, email, phone, company, website_url,
  project_description, audit_results, booked_at, calendly_event_uri,
  utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid,
  status, touch_count, next_touch_at
)
select
  id,
  created_at,
  created_at,
  name,
  email,
  phone,
  company,
  website_url,
  project_description,
  audit,
  booked_at,
  calendly_event_uri,
  utm->>'utm_source',
  utm->>'utm_medium',
  utm->>'utm_campaign',
  utm->>'utm_content',
  utm->>'utm_term',
  utm->>'gclid',
  case
    when booked_at is not null then 'booked'::lead_status
    else 'new'::lead_status
  end,
  0,
  -- Do NOT drop a three-email sequence on months of historical leads the
  -- morning this ships. Only rows young enough to still be in a live
  -- follow-up window get a first touch; everything older is left alone and
  -- can be worked by hand.
  case
    when booked_at is null and created_at > now() - interval '2 days'
      then created_at + interval '2 days'
    else null
  end
from public.leads_legacy;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

create index leads_status_idx     on public.leads (status);
create index leads_owner_idx      on public.leads (owner_id);
create index leads_booked_at_idx  on public.leads (booked_at);
create index leads_created_at_idx on public.leads (created_at desc);

-- Partial. This is the cron's eligibility scan and it stays small as the
-- finished sequences accumulate.
create index leads_next_touch_idx on public.leads (next_touch_at)
  where next_touch_at is not null;

-- The unassigned queue, which is the default view in the CRM.
create index leads_unassigned_idx on public.leads (created_at desc)
  where owner_id is null;

create index activities_lead_idx on public.activities (lead_id, created_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Helper — admin check
--
-- security definer so that the profiles policies can call it without
-- recursing back through profiles' own RLS and deadlocking on themselves.
-- search_path is pinned: a security definer function that resolves names
-- through the caller's search_path is a privilege escalation waiting to be
-- found.
-- ─────────────────────────────────────────────────────────────────────────────

create function public.is_admin() returns boolean
  language sql
  security definer
  stable
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Triggers
-- ─────────────────────────────────────────────────────────────────────────────

create function public.set_updated_at() returns trigger
  language plpgsql
  set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();


-- Status changes are logged in the DATABASE, not the app, so that no code
-- path — server action, cron, SQL editor, psql — can bypass the audit trail.
--
-- security definer because the activities insert policy demands
-- user_id = auth.uid(), and the cron writes as the service role where
-- auth.uid() is null. The function owner owns activities, so it writes
-- through RLS.
create function public.log_status_change() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into public.activities (lead_id, user_id, type, body)
    values (
      new.id,
      auth.uid(),
      'status_change',
      old.status::text || ' → ' || new.status::text
    );
  end if;
  return new;
end;
$$;

create trigger leads_log_status_change
  after update on public.leads
  for each row execute function public.log_status_change();


-- Role changes are an admin-only act.
--
-- RLS grants and revokes rows, not columns, so "a rep may edit their own
-- profile but not their own role" cannot be expressed as a policy. A trigger
-- can, and it raises a readable error instead of silently affecting zero
-- rows.
create function public.guard_profile_role() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin may change a role.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();


-- Staff accounts are created by hand in the Supabase dashboard. This makes
-- the matching profiles row automatic, because "create the auth user, then
-- remember to insert the profile" is a step somebody will skip and the
-- symptom is a login that succeeds into a broken session.
create function public.handle_new_user() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Atomic lead intake
--
-- supabase-js cannot batch two inserts into one transaction, and a lead row
-- without its opening activity is a lead whose timeline starts with a hole.
-- One function, one transaction.
--
-- EXECUTE IS REVOKED FROM anon AND authenticated at the bottom of this file.
-- This is security definer, so leaving it callable by anon would hand anybody
-- holding the public anon key an unauthenticated insert into leads.
-- ─────────────────────────────────────────────────────────────────────────────

create function public.insert_lead_with_activity(
  p_id                  uuid,
  p_name                text,
  p_email               text,
  p_phone               text,
  p_project_description text,
  p_utm_source          text,
  p_utm_medium          text,
  p_utm_campaign        text,
  p_utm_content         text,
  p_utm_term            text,
  p_gclid               text
) returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.leads (
    id, name, email, phone, project_description,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid,
    status, touch_count, owner_id, next_touch_at
  )
  values (
    coalesce(p_id, gen_random_uuid()),
    p_name, p_email, nullif(p_phone, ''), p_project_description,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_gclid,
    'new', 0,
    -- Unassigned on purpose. New leads land in a queue and somebody claims
    -- them; round-robin assignment means every lead has an owner and none
    -- has an owner who is actually looking at it.
    null,
    now() + interval '2 days'
  )
  returning id into v_id;

  insert into public.activities (lead_id, user_id, type, body)
  values (v_id, null, 'note', 'Lead created from enquiry form');

  return v_id;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Row level security
--
-- Enabled on all four tables. Nothing is readable by default.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.leads       enable row level security;
alter table public.activities  enable row level security;
alter table public.email_sends enable row level security;


-- ── profiles ────────────────────────────────────────────────────────────────

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- The role column is guarded by the trigger above, not by this policy.
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());


-- ── leads ───────────────────────────────────────────────────────────────────

create policy leads_select on public.leads
  for select to authenticated
  using (
    public.is_admin()
    or owner_id = auth.uid()
    or owner_id is null
  );

-- USING admits unassigned rows so that Claim works; WITH CHECK requires the
-- row to be OWNED BY THE CALLER once the write lands. Net effect: a rep may
-- take an unassigned lead, may edit their own, and cannot touch another
-- rep's or hand one to somebody else.
--
-- Consequence the UI must respect: a rep changing the status of an
-- unassigned lead has to set owner_id in the same statement or the WITH
-- CHECK rejects it. Touching an unassigned lead claims it. That is the
-- intended behaviour, not a workaround.
create policy leads_update on public.leads
  for update to authenticated
  using (
    public.is_admin()
    or owner_id = auth.uid()
    or owner_id is null
  )
  with check (
    public.is_admin()
    or owner_id = auth.uid()
  );

-- No insert policy: leads arrive from the landing page through the service
-- role. No delete policy for anyone, ever — add an archive flag if it is
-- needed.


-- ── activities ──────────────────────────────────────────────────────────────

create policy activities_select on public.activities
  for select to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = activities.lead_id
        and (public.is_admin() or l.owner_id = auth.uid() or l.owner_id is null)
    )
  );

create policy activities_insert on public.activities
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.leads l
      where l.id = activities.lead_id
        and (public.is_admin() or l.owner_id = auth.uid() or l.owner_id is null)
    )
  );

-- NO UPDATE POLICY. NO DELETE POLICY. Not an oversight — this table is the
-- audit trail and it is append-only. Adding either one later removes the
-- only reason to trust it.


-- ── email_sends ─────────────────────────────────────────────────────────────
-- No policies at all. Service role only, which bypasses RLS. An
-- authenticated user can neither read the ledger nor forge a row into it,
-- and forging a row is exactly how you would suppress somebody's follow-up.


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Grants
--
-- Supabase grants ALL on new public tables to anon and authenticated by
-- default, leaving RLS as the only gate. Belt and braces: take away the
-- privileges these roles have no business holding, so that a future policy
-- mistake cannot become a delete.
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.profiles    from anon, authenticated;
revoke all on public.leads       from anon, authenticated;
revoke all on public.activities  from anon, authenticated;
revoke all on public.email_sends from anon, authenticated;

grant select, update         on public.profiles   to authenticated;
grant select, update         on public.leads      to authenticated;
grant select, insert         on public.activities to authenticated;
-- email_sends: nothing, to either role.

-- anon is the browser's pre-login identity. It gets nothing here.

-- security definer + callable by anon would be an unauthenticated write path
-- into leads for anybody who reads the public bundle.
revoke all on function public.insert_lead_with_activity(
  uuid, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Realtime
--
-- The lead detail view subscribes to its row so that two people working the
-- same lead see each other's changes instead of silently overwriting them.
-- Realtime respects RLS, so a rep only receives events for rows they could
-- already read.
-- ─────────────────────────────────────────────────────────────────────────────

-- Guarded: a publication defined FOR ALL TABLES already covers this and
-- rejects an explicit ADD, and a project without the publication at all
-- should not lose the whole migration over a subscription.
do $$
begin
  if exists (
    select 1 from pg_publication
    where pubname = 'supabase_realtime' and not puballtables
  ) then
    execute 'alter publication supabase_realtime add table public.leads';
  end if;
end $$;

-- REPLICA IDENTITY FULL so the payload carries the old row too. Without it
-- an update event arrives with only the primary key and the banner cannot
-- say what changed.
alter table public.leads replica identity full;


commit;


-- ─────────────────────────────────────────────────────────────────────────────
-- AFTERWARDS
--
-- 1. Verify the backfill before touching anything else:
--
--      select count(*) from public.leads_legacy;
--      select count(*) from public.leads;
--      -- and spot-check a row that had campaign data:
--      select l.utm_campaign, g.utm->>'utm_campaign'
--        from public.leads l
--        join public.leads_legacy g using (id)
--       where g.utm ? 'utm_campaign'
--       limit 5;
--
-- 2. Deploy the landing page changes NOW. Every minute between the commit
--    above and that deploy is a minute where a live form submit fails its
--    insert and has to be recovered from the server log by hand.
--
-- 3. Create the two staff accounts in the dashboard, then promote one:
--
--      update public.profiles set role = 'admin' where id = '<uuid>';
--
--    Run that as the service role in the SQL editor — the guard trigger
--    blocks it from an ordinary session, which is the point.
--
-- 4. Run the RLS tests. Do not build UI until all seven pass.
--
-- 5. leads_legacy is deliberately still here. Drop it after a week of clean
--    running, not today:
--
--      drop table public.leads_legacy;
-- ─────────────────────────────────────────────────────────────────────────────
