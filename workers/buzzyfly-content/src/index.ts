export default {
  async fetch(request: Request): Promise<Response> {
    // Scheduled content generation runs via the Automations cron.
    // This worker is the endpoint the cron hits to publish new posts.
    return new Response(JSON.stringify({ worker: "buzzyfly-content", status: "ready" }), {
      headers: { "content-type": "application/json" },
    });
  },
};
