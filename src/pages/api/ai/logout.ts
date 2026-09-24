import type { APIRoute } from "astro";
import { endSession } from "../../../lib/aiAccess";

export const prerender = false;

export const POST: APIRoute = async ({ locals, cookies, redirect }) => {
	await endSession(locals.runtime.env, cookies);
	return redirect("/ai");
};
