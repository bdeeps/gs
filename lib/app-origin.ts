/**
 * Public site URL for links in transactional email (verify, reset, magic).
 * Prefer NEXT_PUBLIC_APP_URL in production so email links match your canonical host.
 */
export function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

/** Origin for the current HTTP request (good for local dev when env URL is unset). */
export function getRequestOrigin(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}
