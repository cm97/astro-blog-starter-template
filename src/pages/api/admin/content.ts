import type { APIRoute } from "astro";
import { SITE_CONTENT_FIELDS } from "../../../data/siteDefaults";
import { saveSiteContent } from "../../../lib/siteContent";

export const prerender = false;

/**
 * Saves landing-page copy.
 *
 * Only keys declared in SITE_CONTENT_FIELDS are written, so a crafted form post
 * cannot fill the content table with arbitrary rows.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	if (!env.DB) {
		return new Response(null, {
			status: 303,
			headers: { Location: "/admin/content?error=No+database+binding+is+configured." },
		});
	}

	const form = await request.formData();
	const entries: Record<string, string> = {};

	for (const field of SITE_CONTENT_FIELDS) {
		const value = form.get(field.key);
		if (value === null) continue;
		entries[field.key] = String(value).trim();
	}

	await saveSiteContent(env.DB, entries);

	return new Response(null, {
		status: 303,
		headers: { Location: "/admin/content?notice=Landing+page+updated." },
	});
};
