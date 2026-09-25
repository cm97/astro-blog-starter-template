import type { APIRoute } from "astro";
import { draftReply } from "../../../lib/draft";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const body = (await request.json().catch(() => null)) as {
		kind?: string;
		email?: string;
		detail?: string;
		price?: string;
	} | null;
	const kind = body?.kind === "order" ? "order" : body?.kind === "domain" ? "domain" : null;
	const email = (body?.email ?? "").trim().slice(0, 180);
	const detail = (body?.detail ?? "").trim().slice(0, 180);
	const price = (body?.price ?? "").trim().slice(0, 20);
	if (!kind || !email.includes("@") || detail.length < 2) {
		return Response.json({ ok: false, error: "Say who the reply is for." }, { status: 400 });
	}
	const env = locals.runtime?.env as { XAI_API_KEY?: string } | undefined;
	const apiKey = env?.XAI_API_KEY || process.env.XAI_API_KEY;
	if (!apiKey) {
		return Response.json({ ok: false, error: "Grok is not connected on this server." }, { status: 503 });
	}
	try {
		const draft = await draftReply(apiKey, { kind, email, detail, price });
		return Response.json({ ok: true, ...draft });
	} catch (error) {
		console.error("admin draft", error);
		return Response.json({ ok: false, error: "Grok could not write that reply." }, { status: 502 });
	}
};
