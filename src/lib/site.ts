export const SITE_URL = "https://prompt-defenders.vercel.app";
export const SITE_NAME = "Prompt Defenders";
export const SITE_DESCRIPTION =
  "Privacy-first prompt injection scanner for scoring prompt text, surfacing advisories, and gating unsafe inputs before production.";

export const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/rules", changeFrequency: "weekly", priority: 0.8 },
  { path: "/docs/api", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/integrations", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs/security", changeFrequency: "monthly", priority: 0.7 },
] as const;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
