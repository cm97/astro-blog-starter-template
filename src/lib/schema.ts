/**
 * Applies migrations 0006 (email sequence) and 0007 (traffic sources) from
 * inside the Worker, so nobody has to run wrangler by hand. Safe to run on
 * every cron tick and before a signup: each step checks first and only adds
 * what is missing.
 *
 * Keep in step with migrations/0006_email_sequence.sql and
 * migrations/0007_traffic_sources.sql.
 */
const SUBSCRIBER_COLUMNS: Record<string, string> = {
	unsubscribe_token: "TEXT",
	unsubscribed_at: "INTEGER",
	sequence_step: "INTEGER NOT NULL DEFAULT 0",
	sequence_sent_at: "INTEGER",
	source: "TEXT",
};

const FULFILLMENT_COLUMNS: Record<string, string> = {
	source: "TEXT",
};

async function addMissingColumns(
	db: D1Database,
	table: string,
	columns: Record<string, string>,
): Promise<string[]> {
	const info = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
	const existing = new Set((info.results ?? []).map((c) => c.name));
	if (existing.size === 0) return []; // table doesn't exist: nothing to extend

	const added: string[] = [];
	for (const [column, type] of Object.entries(columns)) {
		if (existing.has(column)) continue;
		await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
		added.push(`${table}.${column}`);
	}
	return added;
}

export async function ensureEmailSequenceSchema(db: D1Database): Promise<string[]> {
	const added = [
		...(await addMissingColumns(db, "subscribers", SUBSCRIBER_COLUMNS)),
		...(await addMissingColumns(db, "fulfillments", FULFILLMENT_COLUMNS)),
	];

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
