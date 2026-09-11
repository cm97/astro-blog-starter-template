export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  STRIPE_SECRET_KEY: string;
  PRODUCT_ZIP_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/download' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const key = `dl:${ip}`;
      const now = Date.now();
      const windowStart = now - 60_000;
      await env.DB.prepare('DELETE FROM download_events WHERE ts < ?').bind(windowStart).run();
      const recent = await env.DB.prepare('SELECT COUNT(*) AS c FROM download_events WHERE ip = ? AND ts > ?').bind(ip, windowStart).first();
      if ((recent?.c as number) >= 10) {
        return new Response('Too many downloads. Slow down.', { status: 429 });
      }
      await env.DB.prepare('INSERT INTO download_events (ip, ts) VALUES (?, ?)').bind(ip, now).run();
      const obj = await env.R2.get(env.PRODUCT_ZIP_KEY || 'products/buzzyfly-digital-system.zip');
      if (!obj) return new Response('Product not found', { status: 404 });
      return new Response(obj.body, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="buzzyfly-digital-system.zip"',
        },
      });
    }
    return new Response('Buzzyfly Fulfillment Worker', { status: 200 });
  },
};
