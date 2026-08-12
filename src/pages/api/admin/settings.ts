import type { APIRoute } from "astro";

export const prerender = false;

const SETTINGS_KEYS = ["accent_color", "site_title", "site_description"] as const;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Upserts site-wide settings (accent color, site title/description) into the
 * `site_settings` D1 table. BaseHead reads these at request time, so changes
 * take effect immediately with no redeploy.
 */
export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const env = locals.runtime.env;
	if (!env.DB) return new Response("DB binding not configured", { status: 500 });

	const form = await request.formData().catch(() => null);
	const now = Date.now();

	for (const key of SETTINGS_KEYS) {
		const raw = (form?.get(key) as string) ?? "";
		const value = raw.trim();
		if (!value) continue;
		if (key === "accent_color" && !HEX_COLOR_RE.test(value)) continue;

		await env.DB.prepare(
			`INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
		)
			.bind(key, value, now)
			.run();
	}

	return redirect("/admin?saved=settings");
};
