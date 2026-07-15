/**
 * Server-side proxy (Vercel Edge Function).
 *
 * The browser calls same-origin relative paths (`/api/*`, `/health/*`). Vercel
 * rewrites those to this function (see vercel.json), which forwards them to the
 * backend and injects the Cloudflare Access service-token headers.
 *
 * Because this runs on the server, CF_ACCESS_CLIENT_SECRET is never exposed to
 * the browser. Configure these in Vercel > Project > Settings > Environment
 * Variables (NOT prefixed with VITE_, so they stay server-only):
 *   BACKEND_URL, CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET
 *
 * Edge runtime is used so SSE responses (analyze/stream) stream through
 * unbuffered — the time limit applies to time-to-first-byte, not total duration.
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const backend = process.env.BACKEND_URL || 'https://omni-agent.nuark.ai';
  const cfId = process.env.CF_ACCESS_CLIENT_ID || '';
  const cfSecret = process.env.CF_ACCESS_CLIENT_SECRET || '';

  const incoming = new URL(req.url);

  // vercel.json passes the upstream path as `p` (e.g. "api/v1/analyze/stream").
  const p = (incoming.searchParams.get('p') || '').replace(/^\/+/, '');
  const upstream = new URL('/' + p, backend);

  // Forward every original query param except our internal `p`.
  incoming.searchParams.forEach((value, key) => {
    if (key !== 'p') upstream.searchParams.append(key, value);
  });

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');
  if (cfId && cfSecret) {
    headers.set('CF-Access-Client-Id', cfId);
    headers.set('CF-Access-Client-Secret', cfSecret);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const init = {
    method: req.method,
    headers,
    redirect: 'manual',
  };
  if (hasBody) {
    init.body = req.body;
    init.duplex = 'half'; // required when streaming a request body
  }

  const upstreamResp = await fetch(upstream, init);

  // Strip hop-by-hop / length headers so the streamed body isn't misframed.
  const respHeaders = new Headers(upstreamResp.headers);
  respHeaders.delete('content-encoding');
  respHeaders.delete('content-length');

  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: respHeaders,
  });
}