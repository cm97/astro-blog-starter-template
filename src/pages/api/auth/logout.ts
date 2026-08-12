import type { APIRoute } from "astro";
import { buildLogoutCookie } from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async () => {
	return new Response(null, {
		status: 302,
		headers: {
			Location: "/",
			"Set-Cookie": buildLogoutCookie(),
		},
	});
};
