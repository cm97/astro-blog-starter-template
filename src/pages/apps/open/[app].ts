import type { APIRoute } from "astro";
import { APPS_COOKIE, hasAppsAccess, lockedPage } from "../../../lib/appsAccess";
import { paypalConfigured } from "../../../lib/paypal";
import invoiceMaker from "../../../apps-private/invoice-maker.html?raw";
import contentCalendar from "../../../apps-private/content-calendar.html?raw";
import debtPayoffPlanner from "../../../apps-private/debt-payoff-planner.html?raw";
import leadFollowupTracker from "../../../apps-private/lead-followup-tracker.html?raw";
import csvCleaner from "../../../apps-private/csv-cleaner.html?raw";
import complianceDeadlineTracker from "../../../apps-private/compliance-deadline-tracker.html?raw";
import hiringScorecard from "../../../apps-private/hiring-scorecard.html?raw";
import { env } from "cloudflare:workers";

export const prerender = false;

const APPS: Record<string, string> = {
	"invoice-maker": invoiceMaker,
	"content-calendar": contentCalendar,
	"debt-payoff-planner": debtPayoffPlanner,
	"lead-followup-tracker": leadFollowupTracker,
	"csv-cleaner": csvCleaner,
	"compliance-deadline-tracker": complianceDeadlineTracker,
	"hiring-scorecard": hiringScorecard,
};

/** Serves a paid app only when the request carries a valid Apps Pro token. */
export const GET: APIRoute = async ({ params, locals, cookies }) => {
	const name = String(params.app ?? "").replace(/\.html$/, "");
	const html = APPS[name];
	if (!html) return new Response("Not found", { status: 404 });

	const token = cookies.get(APPS_COOKIE)?.value;
	if (!(await hasAppsAccess(env, token))) {
		return lockedPage(name, { payEnabled: paypalConfigured(env) });
	}

	return new Response(html, {
		status: 200,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "private, no-store",
			"x-robots-tag": "noindex",
		},
	});
};
