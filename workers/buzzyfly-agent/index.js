const OFFERS = [
  { id: "weekly-reset-checklist", name: "Weekly Reset Checklist", price: "$15", url: "https://buy.stripe.com/5kQ7sNdxub3o0sk1lcaVa05" },
  { id: "follow-up-email-templates", name: "Follow-Up Email Templates", price: "$19", url: "https://buy.stripe.com/fZubJ3eByc7s1wo0h8aVa06" },
  { id: "client-onboarding-kit", name: "Client Onboarding Kit", price: "$29", url: "https://buy.stripe.com/3cI8wR50Y8Vg3EwaVMaVa07" },
  { id: "buzzyfly-digital-system", name: "Buzzyfly Digital System", price: "$49", url: "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00" },
  { id: "complete-business-bundle", name: "Complete Business Bundle", price: "$97", url: "https://buy.stripe.com/bJeeVf3WU1sOgri5BsaVa08" },
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/" || path === "/health") {
      return json({
        worker: "buzzyfly-agent",
        site: "https://buzzyfly.com",
        store: "https://buzzyfly.com/store",
        offers: OFFERS,
        routes: ["/health", "/store-check", "/offers", "/draft", "/follow-up", "/logs"],
      });
    }

    if (path === "/offers" || path === "/store-check") {
      const store = await fetch("https://buzzyfly.com/store");
      const html = await store.text();
      const offers = OFFERS.map((offer) => ({
        ...offer,
        onStore: html.includes(offer.url),
      }));
      const body = {
        ok: store.ok && offers.every((offer) => offer.onStore),
        status: store.status,
        offers,
        checkedAt: new Date().toISOString(),
      };
      await save(env, "store-check", body);
      return json(body, body.ok ? 200 : 503);
    }

    if (path === "/draft" && request.method === "POST") {
      const input = await request.json().catch(() => ({}));
      const pain = String(input.pain || "onboarding still lives in your head");
      const offer = OFFERS.find((item) => item.id === input.offer) || OFFERS[3];
      const text = await write(env, [
        "Write a Buzzyfly sales post and a 240-character version.",
        `Product: ${offer.name}, ${offer.price}, one-time payment.`,
        `Link: ${offer.url}`,
        `Pain: ${pain}`,
        "Concrete checklist outcome. No fake numbers. End on the link.",
      ].join("\n"));
      const body = { offer, pain, text, createdAt: new Date().toISOString() };
      await save(env, "draft", body);
      return json(body);
    }

    if (path === "/follow-up" && request.method === "POST") {
      const input = await request.json().catch(() => ({}));
      const name = String(input.name || "there");
      const text = await write(env, [
        `Write one short follow-up email to ${name}.`,
        "They went quiet after a proposal for the Buzzyfly Digital System, $49.",
        "Link: https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00",
        "One note only. No discount. No fake urgency.",
      ].join("\n"));
      const body = { name, text, createdAt: new Date().toISOString() };
      await save(env, "follow-up", body);
      return json(body);
    }

    if (path === "/logs") {
      const listed = env.Bucket ? await env.Bucket.list({ limit: 20 }) : { objects: [] };
      return json({
        objects: (listed.objects || []).map((object) => ({ key: object.key, size: object.size, uploaded: object.uploaded })),
      });
    }

    return json({ error: "Use /health, /store-check, /offers, POST /draft, POST /follow-up, or /logs" }, 404);
  },
};

async function write(env, prompt) {
  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
    });
    return result?.response || JSON.stringify(result);
  } catch (error) {
    return "AI binding failed: " + error.message;
  }
}

async function save(env, kind, body) {
  const key = kind + "/" + new Date().toISOString() + ".json";
  try {
    if (env.Bucket) await env.Bucket.put(key, JSON.stringify(body));
  } catch {
    // Logging must not block the response.
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
