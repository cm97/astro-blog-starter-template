export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Safety-net deploy worker. Real deploys happen via GitHub Actions.
    // This worker responds to health checks and can trigger a rebuild.
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ worker: "buzzyfly-deploy", status: "ok" }), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("buzzyfly-deploy worker online", { status: 200 });
  },
};
