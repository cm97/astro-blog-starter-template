import type { APIRoute } from "astro";
import { sendBrandEmail } from "../../../lib/outbox";
import { logAdminAction } from "../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);
	const field = (name: string) => String(form?.get(name) ?? "");

	const to = field("to").trim();
	const result = await sendBrandEmail(env, {
		to,
		subject: field("subject"),
		body: field("body"),
		fromName: field("fromName"),
	});

	await logAdminAction(env, locals.adminUser ?? "unknown", "email_sent", `${to} — ${result.sent ? "sent" : result.reason}`);

	const params = new URLSearchParams(result.sent ? { status: "sent", to } : { error: result.reason ?? "Send failed." });
	return new Response(null, { status: 303, headers: { Location: `/admin/compose?${params}` } });
};
