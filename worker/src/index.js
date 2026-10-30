// Cloudflare Realtime TURN の認証情報を発行する Worker
// secrets: TURN_KEY_ID, TURN_API_TOKEN
// vars (任意): ALLOWED_ORIGINS (カンマ区切り。未設定なら全て許可)

const TTL_SECONDS = 86400;

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin'
});

export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get('Origin') ?? '';
    const allowed = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let origin = '*';
    if (allowed.length > 0) {
      if (requestOrigin && !allowed.includes(requestOrigin)) {
        return new Response('forbidden', { status: 403 });
      }
      origin = requestOrigin || allowed[0];
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'GET') {
      return new Response('method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.TURN_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ttl: TTL_SECONDS })
      }
    );

    if (!res.ok) {
      // 原因の切り分け用 (401/403: トークン不正, 404: Turn Token ID 不正)
      console.error('cloudflare turn api error', res.status, await res.text());
      return new Response(`failed to generate credentials (upstream ${res.status})`, {
        status: 502,
        headers: corsHeaders(origin)
      });
    }

    return new Response(await res.text(), {
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
};
