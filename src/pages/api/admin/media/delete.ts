import type { APIRoute } from "astro";
import { resolvePublicKey } from "../../../../lib/media";
import { logAdminAction } from "../../../../lib/audit";

export const prerender = false;

/**
 * Deletes one object from the public media prefix.
 *
 * `resolvePublicKey` is what makes this safe to expose: it refuses names
 * containing a path separator or `..`, so a crafted request cannot delete a
 * paid product file out of `products/`.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);
	const name = String(form?.get("name") ?? "");

	const params = new URLSearchParams();
	const key = resolvePublicKey(name);

	if (!key) {
		params.set("error", "That file name isn't valid.");
		return new Response(null, { status: 303, headers: { Location: `/admin/media?${params}` } });
	}

	try {
		await env.MY_PRODUCTS.delete(key);
		await logAdminAction(env, locals.adminUser ?? "unknown", "media_delete", name);
		params.set("deleted", name);
	} catch (error) {
		console.error("Buzzyfly admin: media delete failed", error);
		params.set("error", "Could not delete that file.");
	}

	return new Response(null, { status: 303, headers: { Location: `/admin/media?${params}` } });
};
