/**
 * Shape of a single audit finding.
 *
 * The readout is a terminal, so every finding has to reduce to one status word
 * and one line of plain English. If a finding needs a paragraph to explain, it
 * belongs on the call, not on the page.
 */

export type Verdict =
  /** Working as it should. Shown, because a report that is all bad reads as a sales pitch. */
  | "pass"
  /** Working, but costing them something. */
  | "warn"
  /** Broken, or absent, in a way that loses enquiries. */
  | "fail"
  /** We could not determine it — never dressed up as a pass or a fail. */
  | "unknown";

export type Finding = {
  /** Stable key. Used for React keys and for the emailed report. */
  id: string;
  /** Left column of the readout. Short, mono, no punctuation. */
  label: string;
  /** The status word. */
  verdict: Verdict;
  /** The measured value, if there is one — "2.4s", "94", "not found". */
  value: string;
  /** One line of plain English. What it means for their enquiries. */
  detail: string;
};

export type AuditResult = {
  /** The URL we actually ended on, after redirects. */
  finalUrl: string;
  /** Shown before the email gate. Exactly two. */
  free: Finding[];
  /** Shown after the gate. */
  gated: Finding[];
  /** ISO timestamp of the run, so the emailed report can say when. */
  ranAt: string;
};

/** What stage 1 hands back to the browser. The gated findings are NOT in it. */
export type FreeAuditResponse = {
  ok: true;
  finalUrl: string;
  free: Finding[];
  /** How many checks are waiting behind the gate. Drives the locked rows. */
  lockedCount: number;
  ranAt: string;
};

export type FailedAuditResponse = {
  ok: false;
  /** Shown to the visitor. Always says what to do next. */
  message: string;
};

export type AuditResponse = FreeAuditResponse | FailedAuditResponse;
