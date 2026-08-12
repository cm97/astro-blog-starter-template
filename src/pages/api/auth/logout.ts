import type { APIRoute } from "astro";
import { clearSessionCookie, destroySession, readSessionCookie } from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const token = readSessionCookie(request);
	if (token && env.DB) await destroySession(env, token);

	const isHttps = new URL(request.url).protocol === "https:";
	return new Response(null, {
		status: 303,
		headers: { Location: "/blog", "Set-Cookie": clearSessionCookie(isHttps) },
	});
};
