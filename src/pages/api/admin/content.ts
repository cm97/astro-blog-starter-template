import type { APIRoute } from "astro";

export const prerender = false;

const ALLOWED_SLUGS = new Set(["about"]);

/**
 * Upserts editable copy for a page (currently just /about) into the
 * `site_content` D1 table. The page itself reads this table at request time
 * and falls back to its built-in copy when no row exists yet.
 */
export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const env = locals.runtime.env;
	if (!env.DB) return new Response("DB binding not configured", { status: 500 });

	const form = await request.formData().catch(() => null);
	const slug = (form?.get("slug") as string) ?? "about";
	if (!ALLOWED_SLUGS.has(slug)) {
		return new Response("Unknown page slug", { status: 400 });
	}

	const title = ((form?.get("title") as string) ?? "").trim();
	const description = ((form?.get("description") as string) ?? "").trim();
	const heroImage = ((form?.get("hero_image") as string) ?? "").trim();
	const body = ((form?.get("body") as string) ?? "").trim();

	await env.DB.prepare(
		`INSERT INTO site_content (slug, title, description, hero_image, body, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(slug) DO UPDATE SET
			title = excluded.title,
			description = excluded.description,
			hero_image = excluded.hero_image,
			body = excluded.body,
			updated_at = excluded.updated_at`,
	)
		.bind(slug, title, description, heroImage, body, Date.now())
		.run();

	return redirect("/admin?saved=content");
};
