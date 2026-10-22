/**
 * Frontend configuration. Reads only publishable, browser-safe values.
 * Secrets never live here — provider keys stay server-side in the backend.
 */

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined || "").replace(/\/$/, "");

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined || "").trim();
export const SUPABASE_PUBLISHABLE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined || ""
).trim();

export const isApiConfigured = API_BASE.length > 0;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const appConfig = {
  name: "ATS Resume Studio",
  uploadMaxBytes: 10 * 1024 * 1024,
  acceptedResumeTypes: [".pdf", ".docx", ".tex", ".txt"],
  acceptedEvidenceTypes: [".txt", ".md", ".pdf", ".docx", ".tex"],
};
