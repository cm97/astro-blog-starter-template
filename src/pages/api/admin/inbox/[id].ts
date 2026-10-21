import type { APIRoute } from "astro";
import { logAdminAction } from "../../../../lib/audit";
import { deleteInboxMessage, getInboxMessage, sendReply, setArchived, setRead } from "../../../../lib/inbox";

export const prerender = false;

/** Inbox actions for one message: reply, mark unread, archive, move back, delete. */
export const POST: APIRoute = async ({ params, request, locals }) => {
	const env = locals.runtime.env;
	const id = Number(params.id);
	const form = await request.formData().catch(() => null);
	const action = String(form?.get("action") ?? "");
	const back = (path: string, query: Record<string, string> = {}) => {
		const qs = new URLSearchParams(query).toString();
		return new Response(null, { status: 303, headers: { Location: qs ? `${path}?${qs}` : path } });
	};

	const found = Number.isInteger(id) && id > 0 ? await getInboxMessage(env, id) : null;
	if (!found) return back("/admin/inbox", { error: "That message no longer exists." });
	const { message } = found;
	const actor = locals.adminUser ?? "unknown";

	switch (action) {
		case "reply": {
			const result = await sendReply(env, message, {
				body: String(form?.get("body") ?? ""),
				fromName: String(form?.get("fromName") ?? ""),
			});
			await logAdminAction(env, actor, "inbox_reply", `${message.reply_to ?? message.from_address} — ${result.sent ? "sent" : result.reason}`);
			return back(`/admin/inbox/${id}`, result.sent ? { status: "sent" } : { error: result.reason ?? "Send failed." });
		}
		case "unread":
			await setRead(env, id, false);
			return back("/admin/inbox");
		case "archive":
			await setArchived(env, id, true);
			return back("/admin/inbox", { status: "archived" });
		case "unarchive":
			await setArchived(env, id, false);
			return back(`/admin/inbox/${id}`);
		case "delete":
			await deleteInboxMessage(env, id);
			await logAdminAction(env, actor, "inbox_delete", `${message.from_address} — ${message.subject}`);
			return back("/admin/inbox", message.archived ? { folder: "archived", status: "deleted" } : { status: "deleted" });
		default:
			return back(`/admin/inbox/${id}`, { error: "Unknown action." });
	}
};
