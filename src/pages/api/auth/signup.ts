import type { APIRoute } from "astro";
import { createSession, hashPassword, serializeSessionCookie } from "../../../lib/auth";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

interface SignupFields {
	email: string;
	username: string;
	displayName: string;
	password: string;
}

async function readFields(request: Request): Promise<SignupFields> {
	const contentType = request.headers.get("content-type") ?? "";
	const source = contentType.includes("application/json")
		? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
		: Object.fromEntries((await request.formData().catch(() => new FormData())).entries());

	return {
		email: String(source.email ?? "").trim().toLowerCase(),
		username: String(source.username ?? "").trim().toLowerCase(),
		displayName: String(source.displayName ?? "").trim(),
		password: String(source.password ?? ""),
	};
}

function respond(request: Request, ok: boolean, message: string, headers: HeadersInit = {}) {
	const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");
	if (wantsJson) {
		return new Response(JSON.stringify({ ok, error: ok ? undefined : message }), {
			status: ok ? 200 : 400,
			headers: { "content-type": "application/json", ...headers },
		});
	}
	const location = ok ? "/blog" : `/signup?error=${encodeURIComponent(message)}`;
	return new Response(null, { status: 303, headers: { Location: location, ...headers } });
}

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	if (!env.DB) return respond(request, false, "Signups are not configured on this deployment.");

	const { email, username, displayName, password } = await readFields(request);

	if (!EMAIL_RE.test(email)) return respond(request, false, "Enter a valid email address.");
	if (!USERNAME_RE.test(username)) {
		return respond(
			request,
			false,
			"Username must be 3-24 characters: lowercase letters, numbers, underscores.",
		);
	}
	if (!displayName || displayName.length > 60) {
		return respond(request, false, "Enter a display name (up to 60 characters).");
	}
	if (password.length < 8) return respond(request, false, "Password must be at least 8 characters.");

	const userId = crypto.randomUUID();
	const { hash, salt } = await hashPassword(password);

	try {
		await env.DB.prepare(
			`INSERT INTO users (id, email, username, display_name, password_hash, password_salt, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(userId, email, username, displayName, hash, salt, Date.now())
			.run();
	} catch (error) {
		console.error("Buzzyfly signup: failed to create user", error);
		return respond(request, false, "That email or username is already taken.");
	}

	const token = await createSession(env, userId);
	const isHttps = new URL(request.url).protocol === "https:";
	return respond(request, true, "", { "Set-Cookie": serializeSessionCookie(token, isHttps) });
};
