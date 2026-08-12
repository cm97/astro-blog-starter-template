import type { APIRoute } from "astro";
import { createSession, serializeSessionCookie, verifyPassword } from "../../../lib/auth";

export const prerender = false;

interface LoginFields {
	identifier: string;
	password: string;
}

async function readFields(request: Request): Promise<LoginFields> {
	const contentType = request.headers.get("content-type") ?? "";
	const source = contentType.includes("application/json")
		? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
		: Object.fromEntries((await request.formData().catch(() => new FormData())).entries());

	return {
		identifier: String(source.identifier ?? "").trim().toLowerCase(),
		password: String(source.password ?? ""),
	};
}

function respond(request: Request, ok: boolean, message: string, headers: HeadersInit = {}) {
	const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");
	if (wantsJson) {
		return new Response(JSON.stringify({ ok, error: ok ? undefined : message }), {
			status: ok ? 200 : 401,
			headers: { "content-type": "application/json", ...headers },
		});
	}
	const location = ok ? "/blog" : `/login?error=${encodeURIComponent(message)}`;
	return new Response(null, { status: 303, headers: { Location: location, ...headers } });
}

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	if (!env.DB) return respond(request, false, "Login is not configured on this deployment.");

	const { identifier, password } = await readFields(request);
	if (!identifier || !password) {
		return respond(request, false, "Enter your email/username and password.");
	}

	const user = await env.DB.prepare(
		`SELECT id, password_hash as passwordHash, password_salt as passwordSalt
		 FROM users WHERE email = ? OR username = ?`,
	)
		.bind(identifier, identifier)
		.first<{ id: string; passwordHash: string; passwordSalt: string }>();

	const genericError = "That email/username and password don't match.";
	if (!user) return respond(request, false, genericError);

	const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
	if (!valid) return respond(request, false, genericError);

	const token = await createSession(env, user.id);
	const isHttps = new URL(request.url).protocol === "https:";
	return respond(request, true, "", { "Set-Cookie": serializeSessionCookie(token, isHttps) });
};
