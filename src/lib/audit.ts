export interface AuditLogEntry {
	id: number;
	actor: string;
	action: string;
	detail: string | null;
	created_at: number;
}

/** Best-effort admin action log. Never throws — a logging failure shouldn't fail the admin action itself. */
export async function logAdminAction(
	env: Env,
	actor: string,
	action: string,
	detail?: string,
): Promise<void> {
	if (!env.DB) return;
	try {
		await env.DB.prepare(
			`INSERT INTO admin_audit_log (actor, action, detail, created_at) VALUES (?, ?, ?, ?)`,
		)
			.bind(actor, action, detail ?? null, Date.now())
			.run();
	} catch (error) {
		console.error("Buzzyfly admin: failed to write audit log entry", error);
	}
}

export async function listAuditLog(env: Env, limit = 100): Promise<AuditLogEntry[]> {
	if (!env.DB) return [];
	try {
		const result = await env.DB.prepare(
			`SELECT id, actor, action, detail, created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT ?`,
		)
			.bind(limit)
			.all<AuditLogEntry>();
		return result.results ?? [];
	} catch (error) {
		console.error("Buzzyfly admin: failed to read audit log", error);
		return [];
	}
}
