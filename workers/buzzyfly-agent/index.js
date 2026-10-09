export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/" || path === "/health") {
      return json({
        worker: "buzzyfly-agent",
        site: "https://buzzyfly.com",
        store: "https://buzzyfly.com/store",
        primary: {
          name: "Buzzyfly Digital System",
          price: "$49",
          url: "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00",
        },
        bundle: {
          name: "Complete Business Bundle",
          price: "$97",
          url: "https://buy.stripe.com/bJeeVf3WU1sOgri5BsaVa08",
        },
        does: ["store-check", "draft", "log"],
        doesNot: ["charge a card", "invent a buyer", "move money without Stripe"],
      });
    }

    if (path === "/store-check") {
      const store = await fetch("https://buzzyfly.com/store");
      const html = await store.text();
      const stripe = html.includes("buy.stripe.com/bJebJ3dxudbwejaaVMaVa00");
      const body = {
        ok: store.ok && stripe,
        status: store.status,
        stripeButton: stripe,
        checkedAt: new Date().toISOString(),
      };
      await save(env, "store-check", body);
      return json(body, store.ok && stripe ? 200 : 503);
    }

    if (path === "/draft" && request.method === "POST") {
      const input = await request.json().catch(() => ({}));
      const pain = String(input.pain || "onboarding still lives in your head");
      const prompt = [
        "Write one Buzzyfly blog close and one under-240-character post.",
        "Product: Buzzyfly Digital System, $49, one-time.",
        "Link: https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00",
        "Pain: " + pain,
        "No income promise. No fake testimonials. End on the link.",
      ].join("\n");
      let text = "";
      try {
        const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [{ role: "user", content: prompt }],
        });
        text = result?.response || JSON.stringify(result);
      } catch (error) {
        text = "AI binding failed: " + error.message;
      }
      const body = { pain, text, createdAt: new Date().toISOString() };
      await save(env, "draft", body);
      return json(body);
    }

    return json({ error: "Use /health, /store-check, or POST /draft" }, 404);
  },
};

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
