/**
 * Form state shared by the server action and the form component.
 *
 * This lives outside app/actions.ts deliberately: a "use server" file may only
 * export async functions, so the initial-state constant cannot live beside the
 * action it belongs to.
 */

export type EnquiryFieldName =
  | "name"
  | "company"
  | "email"
  | "phone"
  | "description";

export type EnquiryFormState = {
  ok: boolean;
  /** Field-level errors, keyed by input name. */
  fieldErrors?: Partial<Record<EnquiryFieldName, string>>;
  /** Whole-form error. Always says what went wrong AND how to fix it. */
  formError?: string;
};

export const EMPTY_ENQUIRY_STATE: EnquiryFormState = { ok: false };
