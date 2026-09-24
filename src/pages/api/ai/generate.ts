import type { APIRoute } from "astro";
import { AI_PRO } from "../../../data/monetization";
import { AI_TOOLS } from "../../../data/aiTools";
import { getAiAccess, recordUse } from "../../../lib/aiAccess";

export const prerender = false;

// Workers AI text model. Swap for a larger one if Pro should get better output.
const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MAX_INPUT_CHARS = 2000;

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
	const env = locals.runtime.env;
	if (!env.AI) return json({ error: "AI is not configured on this site yet." }, 503);

	const body = (await request.json().catch(() => null)) as { tool?: string; input?: string } | null;
	const tool = AI_TOOLS[body?.tool ?? ""];
	const input = (body?.input ?? "").trim().slice(0, MAX_INPUT_CHARS);
	if (!tool) return json({ error: "Pick a tool." }, 400);
	if (!input) return json({ error: "Tell the AI what you need first." }, 400);

	const access = await getAiAccess(env, request, cookies);

	if (tool.pro && !access.pro) {
		return json({ paywall: true, reason: "pro-tool", error: `${tool.label} is a Pro tool.` }, 402);
	}
	if (access.remaining <= 0) {
		return json(
			{
				paywall: !access.pro,
				reason: "limit",
				error: access.pro
					? "You've hit today's fair-use limit. It resets at midnight UTC."
					: `You've used your ${AI_PRO.freeDailyUses} free generations for today.`,
			},
			access.pro ? 429 : 402,
		);
	}

	// Count the use before calling the model so parallel requests can't
	// exceed the free allowance.
	await recordUse(env, request, access);

	try {
		const result = (await env.AI.run(MODEL, {
			messages: [
				{ role: "system", content: tool.system },
				{ role: "user", content: input },
			],
			max_tokens: access.pro ? AI_PRO.proMaxTokens : AI_PRO.freeMaxTokens,
		})) as { response?: string };

		return json({
			output: result.response ?? "",
			pro: access.pro,
			remaining: access.remaining - 1,
			limit: access.limit,
		});
	} catch (error) {
		console.error("Buzzyfly AI: generation failed", error);
		return json({ error: "The AI is busy right now — please try again in a moment." }, 502);
	}
};
