import type { APIRoute } from "astro";
import { logAdminAction } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);
	// `subscribers` has no surrogate id — email is the primary key.
	const email = String(form?.get("email") ?? "");
	const q = String(form?.get("q") ?? "");

	if (email && env.DB) {
		try {
			await env.DB.prepare(`DELETE FROM subscribers WHERE email = ?`).bind(email).run();
			await logAdminAction(env, locals.adminUser ?? "unknown", "subscriber_delete", email);
		} catch (error) {
			console.error("Buzzyfly admin: failed to delete subscriber", error);
		}
	}

	const params = new URLSearchParams({ deleted: "1" });
	if (q) params.set("q", q);
	return new Response(null, { status: 303, headers: { Location: `/admin/subscribers?${params}` } });
};
