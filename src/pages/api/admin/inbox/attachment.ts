import type { APIRoute } from "astro";
import { getInboxAttachment } from "../../../../lib/inbox";

export const prerender = false;

/**
 * Downloads one inbox attachment. Admin-only (middleware), and always as a
 * download: a file someone emailed in never renders on the buzzyfly.com origin.
 */
export const GET: APIRoute = async ({ url, locals }) => {
	const env = locals.runtime.env;
	const id = Number(url.searchParams.get("id"));
	const attachment = Number.isInteger(id) && id > 0 ? await getInboxAttachment(env, id) : null;
	const object = attachment && env.MY_PRODUCTS ? await env.MY_PRODUCTS.get(attachment.r2_key) : null;
	if (!attachment || !object) return new Response("Attachment not found.", { status: 404 });

	return new Response(object.body, {
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
			"X-Content-Type-Options": "nosniff",
			"Cache-Control": "private, no-store",
		},
	});
};
