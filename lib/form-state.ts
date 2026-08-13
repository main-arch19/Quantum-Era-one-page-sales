/**
 * Form state shared by the server actions and the form components.
 *
 * This lives outside app/actions.ts deliberately: a "use server" file may only
 * export async functions, so the initial-state constants cannot live beside the
 * actions they belong to.
 */

/**
 * Stage 2 only. Stage 1 has a single field and its own response type
 * (AuditResponse), because what comes back from it is an audit rather than a
 * form result.
 */
export type GateFieldName = "name" | "email" | "company" | "url";

export type GateFormState = {
  ok: boolean;
  /** Field-level errors, keyed by input name. */
  fieldErrors?: Partial<Record<GateFieldName, string>>;
  /** Whole-form error. Always says what went wrong AND how to fix it. */
  formError?: string;
};

export const EMPTY_GATE_STATE: GateFormState = { ok: false };
