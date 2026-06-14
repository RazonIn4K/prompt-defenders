import type { NextApiRequest } from "next";

function headerValue(req: NextApiRequest, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Rate-limit identifier derived from the trusted client IP.
 *
 * On Vercel, `x-vercel-forwarded-for` and `x-real-ip` are set by the platform
 * and cannot be spoofed by the client, so they are preferred. The raw
 * `x-forwarded-for` leftmost entry is client-controllable — a caller could
 * rotate it to mint unlimited fresh rate-limit buckets, or pin a victim's
 * bucket — so it is demoted to a non-Vercel fallback only. `cf-connecting-ip`
 * is not trusted: this service is Vercel-direct, not behind Cloudflare.
 */
export function getClientIdentifier(req: NextApiRequest): string {
  const vercel = headerValue(req, "x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();

  const realIp = headerValue(req, "x-real-ip");
  if (realIp) return realIp;

  const forwardedFor = headerValue(req, "x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return req.socket.remoteAddress || "unknown";
}
