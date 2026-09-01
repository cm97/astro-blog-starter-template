export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/analytics' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT event, COUNT(*) AS c FROM analytics GROUP BY event').all();
      return Response.json(rows.results);
    }
    if (url.pathname === '/api/track' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      await env.DB.prepare('INSERT INTO analytics (event, path, ts) VALUES (?, ?, ?)').bind(body.event || 'pageview', body.path || '/', Date.now()).run();
      return new Response('tracked', { status: 200 });
    }
    return new Response('Buzzyfly Analytics Worker', { status: 200 });
  },
};
