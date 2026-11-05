/**
 * The app's PUBLIC origin for building OAuth redirect URIs, etc. Behind the VPS
 * nginx proxy, a route handler's own `req.url` resolves to the container's
 * internal bind address (0.0.0.0:3000), which is useless as a redirect_uri — so
 * prefer the configured APP_URL, then the forwarded host, then the request.
 */
export function publicOrigin(req: Request): string {
  const env = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, '');
  try {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    /* fall through */
  }
  return new URL(req.url).origin;
}
