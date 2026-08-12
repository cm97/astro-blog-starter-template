import type { APIRoute } from "astro";
import { renderMarkdown } from "../../../lib/markdown";

export const prerender = false;

/** Renders Markdown to sanitized HTML for the composer's live preview pane. */
export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.user) return new Response(JSON.stringify({ error: "Sign in required." }), { status: 401 });

	const body = (await request.json().catch(() => ({}))) as { markdown?: string };
	const markdown = String(body.markdown ?? "").slice(0, 20_000);

	return new Response(JSON.stringify({ html: renderMarkdown(markdown) }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};
