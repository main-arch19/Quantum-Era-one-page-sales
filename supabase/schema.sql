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
