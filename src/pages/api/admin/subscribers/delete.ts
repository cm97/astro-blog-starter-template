import type { APIRoute } from "astro";
import { logAdminAction } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);
	const id = form?.get("id");
	const q = String(form?.get("q") ?? "");

	if (id && env.DB) {
		try {
			const row = await env.DB.prepare(`SELECT email FROM subscribers WHERE id = ?`)
				.bind(id)
				.first<{ email: string }>();
			await env.DB.prepare(`DELETE FROM subscribers WHERE id = ?`).bind(id).run();
			await logAdminAction(env, locals.adminUser ?? "unknown", "subscriber_delete", row?.email);
		} catch (error) {
			console.error("Buzzyfly admin: failed to delete subscriber", error);
		}
	}

	const params = new URLSearchParams({ deleted: "1" });
	if (q) params.set("q", q);
	return new Response(null, { status: 303, headers: { Location: `/admin/subscribers?${params}` } });
};
