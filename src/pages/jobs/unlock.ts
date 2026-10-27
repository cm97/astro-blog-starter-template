import type { APIRoute } from "astro";
import { JOBS_COOKIE, checkJobsAccess, jobsCookieOptions } from "../../lib/jobsAccess";

export const prerender = false;

/** Redeems the link from the Jobs welcome email: verifies it, stores it in an HttpOnly cookie, opens /jobs. */
export const GET: APIRoute = async ({ url, locals, cookies, redirect }) => {
	const token = (url.searchParams.get("token") ?? "").trim().toLowerCase();
	const access = await checkJobsAccess(locals.runtime.env, token);
	if (!access.ok) return redirect(`/jobs?access=${access.reason}`, 302);

	cookies.set(JOBS_COOKIE, token, jobsCookieOptions(url));
	return redirect("/jobs", 302);
};
