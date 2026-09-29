/**
 * Applies migrations/0006_email_sequence.sql from inside the Worker, so the
 * email sequence works without anyone running wrangler by hand. Safe to run
 * on every cron tick: each step checks first and only adds what is missing.
 *
 * Keep in step with migrations/0006_email_sequence.sql.
 */
const SUBSCRIBER_COLUMNS: Record<string, string> = {
	unsubscribe_token: "TEXT",
	unsubscribed_at: "INTEGER",
	sequence_step: "INTEGER NOT NULL DEFAULT 0",
	sequence_sent_at: "INTEGER",
};

export async function ensureEmailSequenceSchema(db: D1Database): Promise<string[]> {
	const info = await db.prepare(`PRAGMA table_info(subscribers)`).all<{ name: string }>();
	const existing = new Set((info.results ?? []).map((c) => c.name));
	if (existing.size === 0) return []; // no subscribers table: nothing to extend

	const added: string[] = [];
	for (const [column, type] of Object.entries(SUBSCRIBER_COLUMNS)) {
		if (existing.has(column)) continue;
		await db.prepare(`ALTER TABLE subscribers ADD COLUMN ${column} ${type}`).run();
		added.push(column);
	}

	await db
		.prepare(
			`CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token
			 ON subscribers (unsubscribe_token)`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS followup_emails (
			   provider TEXT NOT NULL,
			   order_id TEXT NOT NULL,
			   sent_at  INTEGER NOT NULL,
			   success  INTEGER NOT NULL,
			   PRIMARY KEY (provider, order_id)
			 )`,
		)
		.run();

	return added;
}
