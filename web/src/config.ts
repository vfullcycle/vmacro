export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://vmacro.persiq.net";

// BL-11 temp instrumentation (2026-08-19) — flip to false (or delete the call site +
// the search_latency_log table/migration) once the search UX decision is made.
// See PROJECT_BIBLE §7 BL-11.
export const SEARCH_LATENCY_LOGGING = true;

// Safe to keep as a public default: the anon key is designed to be embedded in client bundles
// (RLS is what actually protects data, not secrecy of this key).
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://fagkzpygsqiwnaluozdc.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZ2t6cHlnc3Fpd25hbHVvemRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MTUwMjcsImV4cCI6MjEwMTk5MTAyN30.RFt-mOtQQ5thWURCDoVze_mZ_5SL_ZUUpv3bbZdwaIo";
