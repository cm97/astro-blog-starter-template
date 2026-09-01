export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/log" && request.method === "POST") {
      const body = await request.json() as any;
      await env.DB.prepare("INSERT INTO events (type, path, ip, ts) VALUES (?, ?, ?, ?)").bind(body.type || "view", body.path || "/", request.headers.get("cf-connecting-ip") || "unknown", Date.now()).run();
      return new Response("logged");
    }
    if (url.pathname === "/report") {
      const rows = await env.DB.prepare("SELECT type, count(*) as c FROM events GROUP BY type").all();
      return new Response(JSON.stringify(rows.results), { headers: { "content-type": "application/json" } });
    }
    return new Response("buzzyfly-analytics online");
  },
};
