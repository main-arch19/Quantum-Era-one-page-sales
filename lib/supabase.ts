import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase, service-role, SERVER ONLY.
 *
 * The "server-only" import above is load-bearing: this module holds a key that
 * bypasses row-level security entirely, and importing it into a client
 * component would ship that key to the browser. With this import that mistake
 * is a build error rather than a breach.
 *
 * A booking is still not an entity. booked_at is a nullable column on the
 * lead, because the query that pays for this page is:
 *
 *   select * from leads where booked_at is null
 *
 * Those are the people who gave us their details and did not book. That list
 * is worth more than the bookings, and a schema that splits it across two
 * tables makes it a join nobody remembers to write.
 *
 * The database now also carries profiles, activities and email_sends for the
 * internal CRM. This app does not read them: it writes leads and it appends
 * one activity per lead through insert_lead_with_activity. See
 * supabase/crm-migration.sql.
 */

/**
 * The columns this app touches. The CRM adds status, owner_id, touch_count
 * and next_touch_at, which are set at insert and then owned by the CRM —
 * nothing here reads or writes them afterwards, except the Calendly webhook
 * clearing next_touch_at to stop the follow-up sequence.
 */
export type LeadRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  project_description: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  booked_at: string | null;
  calendly_event_uri: string | null;
};

let cached: SupabaseClient | null = null;

/**
 * Returns the client, or null when Supabase is not configured.
 *
 * Null rather than throwing, deliberately. This page runs on paid traffic; a
 * misconfigured database must never be the reason a lead we already paid for
 * cannot submit the form. Every caller treats persistence as best-effort and
 * falls back to the Resend email, which is the path that has always existed.
 */
export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
