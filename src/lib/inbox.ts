import PostalMime, { type Address, type Attachment } from "postal-mime";
import { BUZZYFLY_CONFIG } from "../data/monetization";
import { ALLOWED_SENDERS, type EmailBinding, type EmailResult } from "./email";
import { sendBrandEmail } from "./outbox";

/**
 * Admin inbox (/admin/inbox).
 *
 * Cloudflare Email Routing hands mail sent to @buzzyfly.com to the Worker's
 * `email` handler (src/worker-entry.ts), which calls `receiveEmail`. The
 * message is parsed and kept in D1. Attachments go to the MY_PRODUCTS R2
 * bucket under INBOX_PREFIX, apart from the paid `products/` files and the
 * public `public/` media, and are only served to a signed-in admin.
 *
 * Replies go out through the same Cloudflare Email Service binding as every
 * other Buzzyfly email (sendBrandEmail), so they are kept in the Sent list too.
 */

export const INBOX_PREFIX = "inbox/";

// D1 caps a row at 2 MB. Bodies past this are cut so one huge newsletter
// can't fail the whole insert.
const MAX_BODY_CHARS = 400_000;
// Attachments past this are listed but not stored.
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const PAGE_SIZE = 50;

export interface InboxMessage {
	id: number;
	message_id: string | null;
	references_h: string | null;
	from_address: string;
	from_name: string;
	reply_to: string | null;
	to_address: string;
	subject: string;
	text_body: string;
	html_body: string | null;
	received_at: number;
	read_at: number | null;
	archived: number;
	replied_at: number | null;
}

export interface InboxListItem {
	id: number;
	from_address: string;
	from_name: string;
	to_address: string;
	subject: string;
	snippet: string;
	received_at: number;
	read_at: number | null;
	attachments: number;
}

export interface InboxAttachment {
	id: number;
	message_id: number;
	filename: string;
	mime_type: string;
	size: number;
	r2_key: string;
}

type InboxEnv = { DB?: D1Database; MY_PRODUCTS?: R2Bucket };

export async function ensureInboxSchema(db: D1Database): Promise<void> {
	await db.batch([
		db.prepare(
			`CREATE TABLE IF NOT EXISTS inbox_messages (
			   id           INTEGER PRIMARY KEY AUTOINCREMENT,
			   message_id   TEXT,
			   references_h TEXT,
			   from_address TEXT    NOT NULL,
			   from_name    TEXT    NOT NULL DEFAULT '',
			   reply_to     TEXT,
			   to_address   TEXT    NOT NULL,
			   subject      TEXT    NOT NULL DEFAULT '',
			   text_body    TEXT    NOT NULL DEFAULT '',
			   html_body    TEXT,
			   received_at  INTEGER NOT NULL,
			   read_at      INTEGER,
			   archived     INTEGER NOT NULL DEFAULT 0,
			   replied_at   INTEGER
			 )`,
		),
		db.prepare(`CREATE INDEX IF NOT EXISTS idx_inbox_messages_folder ON inbox_messages (archived, received_at)`),
		db.prepare(
			`CREATE TABLE IF NOT EXISTS inbox_attachments (
			   id         INTEGER PRIMARY KEY AUTOINCREMENT,
			   message_id INTEGER NOT NULL,
			   filename   TEXT    NOT NULL,
			   mime_type  TEXT    NOT NULL,
			   size       INTEGER NOT NULL,
			   r2_key     TEXT    NOT NULL
			 )`,
		),
		db.prepare(`CREATE INDEX IF NOT EXISTS idx_inbox_attachments_message ON inbox_attachments (message_id)`),
	]);
}

function firstMailbox(addresses: Address | Address[] | undefined): { name: string; address: string } | null {
	const list = Array.isArray(addresses) ? addresses : addresses ? [addresses] : [];
	for (const entry of list) {
		if (entry.group) {
			const inner = entry.group.find((m) => m.address);
			if (inner) return { name: inner.name, address: inner.address };
		} else if (entry.address) {
			return { name: entry.name, address: entry.address };
		}
	}
	return null;
}

function attachmentBytes(attachment: Attachment): Uint8Array {
	const { content } = attachment;
	if (typeof content === "string") return new TextEncoder().encode(content);
	return content instanceof Uint8Array ? content : new Uint8Array(content);
}

/** Keeps a stored file name readable and safe to put in a header. */
export function cleanFilename(name: string | null, index: number): string {
	const cleaned = (name ?? "").replace(/[\u0000-\u001f"\\/]/g, "").trim().slice(0, 150);
	return cleaned || `attachment-${index + 1}`;
}

/** Rough plain text for HTML-only mail, so the list preview and the quoted reply aren't empty. */
export function htmlToText(html: string): string {
	return html
		.replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/[ \t]+/g, " ")
		.replace(/\n\s*\n\s*\n+/g, "\n\n")
		.trim();
}

export interface ParsedIncoming {
	message: Omit<InboxMessage, "id" | "read_at" | "archived" | "replied_at">;
	attachments: { filename: string; mimeType: string; bytes: Uint8Array }[];
	skippedAttachments: string[];
}

/** Turns a raw incoming email into what the inbox stores. */
export async function parseIncoming(
	raw: ReadableStream<Uint8Array> | ArrayBuffer | string,
	envelope: { from: string; to: string },
	now = Date.now(),
): Promise<ParsedIncoming> {
	const email = await PostalMime.parse(raw);
	const from = firstMailbox(email.from) ?? { name: "", address: envelope.from };
	const replyTo = firstMailbox(email.replyTo);

	const attachments: ParsedIncoming["attachments"] = [];
	const skippedAttachments: string[] = [];
	email.attachments.forEach((attachment, index) => {
		const filename = cleanFilename(attachment.filename, index);
		const bytes = attachmentBytes(attachment);
		if (bytes.byteLength > MAX_ATTACHMENT_BYTES) skippedAttachments.push(filename);
		else attachments.push({ filename, mimeType: attachment.mimeType || "application/octet-stream", bytes });
	});

	let text = email.text?.trim() ? email.text : email.html ? htmlToText(email.html) : "";
	if (skippedAttachments.length) {
		text += `\n\n[Not saved, too large: ${skippedAttachments.join(", ")}]`;
	}

	return {
		message: {
			message_id: email.messageId ?? null,
			references_h: email.references ?? null,
			from_address: from.address.toLowerCase(),
			from_name: from.name,
			reply_to: replyTo && replyTo.address.toLowerCase() !== from.address.toLowerCase() ? replyTo.address : null,
			to_address: envelope.to.toLowerCase(),
			subject: (email.subject ?? "").slice(0, 500),
			text_body: text.slice(0, MAX_BODY_CHARS),
			html_body: email.html ? email.html.slice(0, MAX_BODY_CHARS) : null,
			received_at: now,
		},
		attachments,
		skippedAttachments,
	};
}

/**
 * Stores one incoming email. Throws if it can't be stored, so the sending
 * server gets an error and the sender is told it didn't arrive, rather than
 * the message disappearing silently.
 */
export async function receiveEmail(
	message: { from: string; to: string; raw: ReadableStream<Uint8Array> },
	env: InboxEnv,
): Promise<number> {
	if (!env.DB) throw new Error("Inbox: no D1 database bound");
	await ensureInboxSchema(env.DB);

	const parsed = await parseIncoming(message.raw, { from: message.from, to: message.to });
	const m = parsed.message;
	const inserted = await env.DB.prepare(
		`INSERT INTO inbox_messages
		   (message_id, references_h, from_address, from_name, reply_to, to_address, subject, text_body, html_body, received_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 RETURNING id`,
	)
		.bind(m.message_id, m.references_h, m.from_address, m.from_name, m.reply_to, m.to_address, m.subject, m.text_body, m.html_body, m.received_at)
		.first<{ id: number }>();
	if (!inserted) throw new Error("Inbox: insert returned no id");
	const id = inserted.id;

	if (parsed.attachments.length && !env.MY_PRODUCTS) {
		console.error(`Inbox: message ${id} has ${parsed.attachments.length} attachment(s) but no R2 bucket is bound`);
	}
	if (env.MY_PRODUCTS) {
		for (const [index, attachment] of parsed.attachments.entries()) {
			const key = `${INBOX_PREFIX}${id}/${index}`;
			try {
				await env.MY_PRODUCTS.put(key, attachment.bytes, { httpMetadata: { contentType: attachment.mimeType } });
				await env.DB.prepare(
					`INSERT INTO inbox_attachments (message_id, filename, mime_type, size, r2_key) VALUES (?, ?, ?, ?, ?)`,
				)
					.bind(id, attachment.filename, attachment.mimeType, attachment.bytes.byteLength, key)
					.run();
			} catch (error) {
				console.error(`Inbox: attachment "${attachment.filename}" on message ${id} not saved`, error);
			}
		}
	}
	return id;
}

export type InboxFolder = "inbox" | "archived";

export async function listInbox(
	env: InboxEnv,
	options: { folder: InboxFolder; query?: string; page?: number },
): Promise<{ items: InboxListItem[]; hasMore: boolean }> {
	if (!env.DB) return { items: [], hasMore: false };
	await ensureInboxSchema(env.DB);

	const page = Math.max(1, options.page ?? 1);
	const where = ["m.archived = ?"];
	const args: unknown[] = [options.folder === "archived" ? 1 : 0];
	const query = options.query?.trim();
	if (query) {
		const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
		where.push(
			`(m.subject LIKE ? ESCAPE '\\' OR m.from_address LIKE ? ESCAPE '\\' OR m.from_name LIKE ? ESCAPE '\\' OR m.text_body LIKE ? ESCAPE '\\')`,
		);
		args.push(like, like, like, like);
	}

	const rows = await env.DB.prepare(
		`SELECT m.id, m.from_address, m.from_name, m.to_address, m.subject, substr(m.text_body, 1, 160) AS snippet,
		        m.received_at, m.read_at,
		        (SELECT COUNT(*) FROM inbox_attachments a WHERE a.message_id = m.id) AS attachments
		 FROM inbox_messages m
		 WHERE ${where.join(" AND ")}
		 ORDER BY m.received_at DESC
		 LIMIT ? OFFSET ?`,
	)
		.bind(...args, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)
		.all<InboxListItem>();

	const items = rows.results ?? [];
	return { items: items.slice(0, PAGE_SIZE), hasMore: items.length > PAGE_SIZE };
}

/** Unread count for the admin sidebar. Never throws: the sidebar is on every admin page. */
export async function unreadCount(env: InboxEnv): Promise<number> {
	if (!env.DB) return 0;
	try {
		const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM inbox_messages WHERE read_at IS NULL AND archived = 0`).first<{ n: number }>();
		return row?.n ?? 0;
	} catch {
		return 0; // table not created yet: no mail has arrived
	}
}

export async function getInboxMessage(
	env: InboxEnv,
	id: number,
): Promise<{ message: InboxMessage; attachments: InboxAttachment[] } | null> {
	if (!env.DB) return null;
	await ensureInboxSchema(env.DB);
	const message = await env.DB.prepare(`SELECT * FROM inbox_messages WHERE id = ?`).bind(id).first<InboxMessage>();
	if (!message) return null;
	const attachments = await env.DB.prepare(`SELECT * FROM inbox_attachments WHERE message_id = ? ORDER BY id`)
		.bind(id)
		.all<InboxAttachment>();
	return { message, attachments: attachments.results ?? [] };
}

export async function getInboxAttachment(env: InboxEnv, id: number): Promise<InboxAttachment | null> {
	if (!env.DB) return null;
	await ensureInboxSchema(env.DB);
	const row = await env.DB.prepare(`SELECT * FROM inbox_attachments WHERE id = ?`).bind(id).first<InboxAttachment>();
	// Only ever hand out inbox objects, whatever ends up in the row.
	return row && row.r2_key.startsWith(INBOX_PREFIX) ? row : null;
}

export async function setRead(env: InboxEnv, id: number, read: boolean): Promise<void> {
	if (!env.DB) return;
	await env.DB.prepare(`UPDATE inbox_messages SET read_at = ? WHERE id = ?`).bind(read ? Date.now() : null, id).run();
}

export async function setArchived(env: InboxEnv, id: number, archived: boolean): Promise<void> {
	if (!env.DB) return;
	await env.DB.prepare(`UPDATE inbox_messages SET archived = ? WHERE id = ?`).bind(archived ? 1 : 0, id).run();
}

export async function deleteInboxMessage(env: InboxEnv, id: number): Promise<void> {
	if (!env.DB) return;
	const attachments = await env.DB.prepare(`SELECT r2_key FROM inbox_attachments WHERE message_id = ?`)
		.bind(id)
		.all<{ r2_key: string }>();
	const keys = (attachments.results ?? []).map((a) => a.r2_key).filter((k) => k.startsWith(INBOX_PREFIX));
	if (keys.length && env.MY_PRODUCTS) await env.MY_PRODUCTS.delete(keys);
	await env.DB.batch([
		env.DB.prepare(`DELETE FROM inbox_attachments WHERE message_id = ?`).bind(id),
		env.DB.prepare(`DELETE FROM inbox_messages WHERE id = ?`).bind(id),
	]);
}

/** Replies come from the address the mail was sent to when we're allowed to send from it. */
export function replyFromAddress(toAddress: string): string {
	const to = toAddress.trim().toLowerCase();
	return ALLOWED_SENDERS.includes(to) ? to : BUZZYFLY_CONFIG.brandEmail;
}

export function replySubject(subject: string): string {
	const trimmed = subject.trim();
	if (!trimmed) return "Re: your email";
	return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}

export function quoteOriginal(message: Pick<InboxMessage, "from_address" | "from_name" | "received_at" | "text_body">): string {
	const who = message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address;
	const when = new Date(message.received_at).toUTCString();
	const quoted = message.text_body
		.trim()
		.split("\n")
		.slice(0, 200)
		.map((line) => `> ${line}`)
		.join("\n");
	return `On ${when}, ${who} wrote:\n${quoted}`;
}

export async function sendReply(
	env: InboxEnv & { EMAIL?: EmailBinding },
	message: InboxMessage,
	reply: { body: string; fromName: string },
): Promise<EmailResult> {
	const body = reply.body.trim();
	if (!body) return { sent: false, reason: "Write a reply first." };

	const headers: Record<string, string> = {};
	if (message.message_id) {
		headers["In-Reply-To"] = message.message_id;
		headers["References"] = [message.references_h, message.message_id].filter(Boolean).join(" ");
	}

	const result = await sendBrandEmail(env, {
		to: message.reply_to ?? message.from_address,
		subject: replySubject(message.subject),
		body: `${body}\n\n${quoteOriginal(message)}`,
		fromName: reply.fromName,
		fromEmail: replyFromAddress(message.to_address),
		headers: Object.keys(headers).length ? headers : undefined,
	});

	if (result.sent && env.DB) {
		await env.DB.prepare(`UPDATE inbox_messages SET replied_at = ? WHERE id = ?`).bind(Date.now(), message.id).run();
	}
	return result;
}
