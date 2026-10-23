/**
 * Frontend configuration. Reads only publishable, browser-safe values.
 * Secrets never live here — provider keys stay server-side in the backend.
 */

const envString = (value: unknown): string => (typeof value === "string" ? value : "");

export const API_BASE = envString(import.meta.env["VITE_API_URL"]).replace(/\/$/, "");

export const SUPABASE_URL = envString(import.meta.env["VITE_SUPABASE_URL"]).trim();
export const SUPABASE_PUBLISHABLE_KEY = envString(import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]).trim();

export const isApiConfigured = API_BASE.length > 0;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const appConfig = {
  name: "ATS Resume Studio",
  uploadMaxBytes: 10 * 1024 * 1024,
  acceptedResumeTypes: [".pdf", ".docx", ".tex", ".txt"],
  acceptedEvidenceTypes: [".txt", ".md", ".pdf", ".docx", ".tex"],
};
