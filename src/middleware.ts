import { defineMiddleware } from "astro:middleware";
import { getSessionUser } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
	const env = context.locals.runtime?.env;
	context.locals.user = env ? await getSessionUser(context.request, env) : null;
	return next();
});
