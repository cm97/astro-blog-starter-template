import type { APIRoute } from "astro";
import { APPS_COOKIE, hasAppsAccess, lockedPage } from "../../../lib/appsAccess";
import invoiceMaker from "../../../apps-private/invoice-maker.html?raw";
import contentCalendar from "../../../apps-private/content-calendar.html?raw";

export const prerender = false;

const APPS: Record<string, string> = {
	"invoice-maker": invoiceMaker,
	"content-calendar": contentCalendar,
};

/** Serves a paid app only when the request carries a valid Apps Pro token. */
export const GET: APIRoute = async ({ params, locals, cookies }) => {
	const name = String(params.app ?? "").replace(/\.html$/, "");
	const html = APPS[name];
	if (!html) return new Response("Not found", { status: 404 });

	const token = cookies.get(APPS_COOKIE)?.value;
	if (!(await hasAppsAccess(locals.runtime.env, token))) return lockedPage(name);

	return new Response(html, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "private, no-store",
			"x-robots-tag": "noindex",
		},
	});
};
