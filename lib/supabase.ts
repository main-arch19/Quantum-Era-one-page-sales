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
 * There is exactly ONE table. Bookings are not a separate table and must not
 * become one — booked_at is a nullable column on the lead, because the query
 * that pays for this page is:
 *
 *   select * from leads where booked_at is null
 *
 * Those are the people who ran the audit, saw their site was losing enquiries,
 * gave us an email, and did not book. That list is worth more than the
 * bookings, and a schema that splits it across two tables makes it a join
 * nobody remembers to write.
 */

export type LeadRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company: string;
  website_url: string;
  audit: unknown;
  utm: Record<string, string> | null;
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
