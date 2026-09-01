export default {
  async fetch(request: Request): Promise<Response> {
    // Traffic worker. Real distribution happens via scheduled posts.
    return new Response(JSON.stringify({ worker: "buzzyfly-traffic", status: "ready" }), {
      headers: { "content-type": "application/json" },
    });
  },
};
