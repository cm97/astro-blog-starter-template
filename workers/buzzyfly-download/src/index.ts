const RATE_LIMIT = 10; // per IP per minute

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const key = `dl:${ip}`;
    const count = Number((await env.DB.prepare("SELECT count FROM rate WHERE k=?").bind(key).first())?.count || 0);
    if (count >= RATE_LIMIT) {
      return new Response("Slow down, cowboy.", { status: 429 });
    }
    await env.DB.prepare("INSERT INTO rate (k, count, ts) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET count = count + 1").bind(key, Date.now()).run();

    // Log the download
    await env.DB.prepare("INSERT INTO downloads (ip, ts) VALUES (?, ?)").bind(ip, Date.now()).run();

    const obj = await env.BUCKET.get("products/buzzyfly-digital-system.zip");
    if (!obj) return new Response("Product file missing. Fix the bucket.", { status: 500 });
    return new Response(obj.body, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": 'attachment; filename="buzzyfly-digital-system.zip"',
      },
    });
  },
};
