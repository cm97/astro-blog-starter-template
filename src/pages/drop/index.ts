import type { APIRoute } from "astro";
import { DROP_COOKIE, checkDropAccess } from "../../lib/dropAccess";
import { dropLockedPage } from "../../lib/dropPages";
import dropApp from "../../apps-private/monthly-drop.html?raw";

export const prerender = false;

/** Serves the Monthly Drop app only to an active subscriber. */
export const GET: APIRoute = async ({ locals, cookies }) => {
	const access = await checkDropAccess(locals.runtime.env, cookies.get(DROP_COOKIE)?.value);
	if (!access.ok) return dropLockedPage(access.reason);

	return new Response(dropApp, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "private, no-store",
			"x-robots-tag": "noindex",
		},
	});
};
