// D1-backed product catalog.
//
// Replaces the hardcoded PRODUCT_FILE_MAP as the source of truth for what is on
// sale. Products are created and edited from the admin console at runtime, so
// adding something to the shop no longer needs a code change or a deploy.

export type ProductStatus = "draft" | "active";

export interface Product {
	/** URL-safe slug; also the default payment item identifier. */
	id: string;
	title: string;
	/** One-line pitch shown on the product card. */
	summary: string;
	/** Longer copy shown on the product's own page. */
	description: string;
	features: string[];
	priceCents: number;
	currency: string;
	checkoutUrl: string | null;
	/** Object key inside the private MY_PRODUCTS R2 bucket. */
	r2Key: string | null;
	fileName: string | null;
	contentType: string;
	status: ProductStatus;
	sortOrder: number;
	createdAt: number;
	updatedAt: number;
}

interface ProductRow {
	id: string;
	title: string;
	summary: string;
	description: string;
	features: string;
	price_cents: number;
	currency: string;
	checkout_url: string | null;
	r2_key: string | null;
	file_name: string | null;
	content_type: string;
	status: string;
	sort_order: number;
	created_at: number;
	updated_at: number;
}

function rowToProduct(row: ProductRow): Product {
	let features: string[] = [];
	try {
		const parsed = JSON.parse(row.features);
		// Guard against a hand-edited row containing valid JSON of the wrong
		// shape — a string or object here would break `.map` at render time.
		if (Array.isArray(parsed)) features = parsed.filter((f): f is string => typeof f === "string");
	} catch {
		features = [];
	}

	return {
		id: row.id,
		title: row.title,
		summary: row.summary,
		description: row.description,
		features,
		priceCents: row.price_cents,
		currency: row.currency,
		checkoutUrl: row.checkout_url,
		r2Key: row.r2_key,
		fileName: row.file_name,
		contentType: row.content_type,
		status: row.status === "active" ? "active" : "draft",
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/**
 * Lists products. Public callers get only published ones; the admin console
 * passes `includeDrafts` to see everything.
 */
export async function listProducts(
	db: D1Database,
	options: { includeDrafts?: boolean } = {},
): Promise<Product[]> {
	const sql = options.includeDrafts
		? "SELECT * FROM products ORDER BY sort_order ASC, created_at ASC"
		: "SELECT * FROM products WHERE status = 'active' ORDER BY sort_order ASC, created_at ASC";

	const { results } = await db.prepare(sql).all<ProductRow>();
	return (results ?? []).map(rowToProduct);
}

export async function getProduct(db: D1Database, id: string): Promise<Product | null> {
	const row = await db.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<ProductRow>();
	return row ? rowToProduct(row) : null;
}

export interface ProductInput {
	id: string;
	title: string;
	summary: string;
	description: string;
	features: string[];
	priceCents: number;
	currency: string;
	checkoutUrl: string | null;
	r2Key: string | null;
	fileName: string | null;
	contentType: string;
	status: ProductStatus;
	sortOrder: number;
}

/** Creates or updates a product, preserving `created_at` on update. */
export async function upsertProduct(db: D1Database, input: ProductInput): Promise<void> {
	const timestamp = Math.floor(Date.now() / 1000);

	await db
		.prepare(
			`INSERT INTO products (
			   id, title, summary, description, features,
			   price_cents, currency, checkout_url, r2_key, file_name, content_type,
			   status, sort_order, created_at, updated_at
			 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT (id) DO UPDATE SET
			   title        = excluded.title,
			   summary      = excluded.summary,
			   description  = excluded.description,
			   features     = excluded.features,
			   price_cents  = excluded.price_cents,
			   currency     = excluded.currency,
			   checkout_url = excluded.checkout_url,
			   r2_key       = excluded.r2_key,
			   file_name    = excluded.file_name,
			   content_type = excluded.content_type,
			   status       = excluded.status,
			   sort_order   = excluded.sort_order,
			   updated_at   = excluded.updated_at`,
		)
		.bind(
			input.id,
			input.title,
			input.summary,
			input.description,
			JSON.stringify(input.features),
			input.priceCents,
			input.currency,
			input.checkoutUrl,
			input.r2Key,
			input.fileName,
			input.contentType,
			input.status,
			input.sortOrder,
			timestamp,
			timestamp,
		)
		.run();

	// Keep the slug usable as a payment item_id so checkout links that pass the
	// slug as metadata.item_id resolve without extra admin setup.
	await db
		.prepare(
			`INSERT OR IGNORE INTO product_item_ids (item_id, product_id, provider, created_at)
			 VALUES (?, ?, NULL, ?)`,
		)
		.bind(input.id, input.id, timestamp)
		.run();
}

export async function deleteProduct(db: D1Database, id: string): Promise<void> {
	// product_item_ids cascades, but D1 only enforces foreign keys when the
	// pragma is on, so the mapping rows are removed explicitly.
	await db.batch([
		db.prepare("DELETE FROM product_item_ids WHERE product_id = ?").bind(id),
		db.prepare("DELETE FROM products WHERE id = ?").bind(id),
	]);
}

/** Returns the extra payment identifiers mapped to a product, excluding its slug. */
export async function listItemIds(db: D1Database, productId: string): Promise<string[]> {
	const { results } = await db
		.prepare("SELECT item_id FROM product_item_ids WHERE product_id = ? ORDER BY item_id")
		.bind(productId)
		.all<{ item_id: string }>();

	return (results ?? []).map((r) => r.item_id).filter((itemId) => itemId !== productId);
}

/**
 * Replaces the set of extra payment identifiers for a product. The slug mapping
 * is managed by `upsertProduct` and is never removed here.
 */
export async function setItemIds(
	db: D1Database,
	productId: string,
	itemIds: string[],
): Promise<void> {
	const timestamp = Math.floor(Date.now() / 1000);
	const statements = [
		db
			.prepare("DELETE FROM product_item_ids WHERE product_id = ? AND item_id != ?")
			.bind(productId, productId),
	];

	for (const itemId of new Set(itemIds.filter(Boolean))) {
		if (itemId === productId) continue;
		statements.push(
			db
				.prepare(
					`INSERT INTO product_item_ids (item_id, product_id, provider, created_at)
					 VALUES (?, ?, NULL, ?)
					 ON CONFLICT (item_id) DO UPDATE SET product_id = excluded.product_id`,
				)
				.bind(itemId, productId, timestamp),
		);
	}

	await db.batch(statements);
}

/**
 * Resolves the product a purchase refers to. Tries the external identifier
 * mapping first (a Stripe price_id or Lemon Squeezy variant_id), then falls
 * back to treating the identifier as a product slug.
 */
export async function resolveProductByItemId(
	db: D1Database,
	itemId: string,
): Promise<Product | null> {
	const mapping = await db
		.prepare("SELECT product_id FROM product_item_ids WHERE item_id = ?")
		.bind(itemId)
		.first<{ product_id: string }>();

	if (mapping?.product_id) {
		const product = await getProduct(db, mapping.product_id);
		if (product) return product;
	}

	return getProduct(db, itemId);
}

/** Formats a minor-unit price for display, e.g. 4900 USD -> "$49.00". */
export function formatPrice(priceCents: number, currency: string): string {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency || "USD",
		}).format(priceCents / 100);
	} catch {
		// An invalid currency code from a hand-edited row should not blank the
		// whole page — fall back to a plain rendering.
		return `${(priceCents / 100).toFixed(2)} ${currency}`;
	}
}

/** Normalizes a title into a URL-safe slug used as the product id. */
export function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

/**
 * Parses a price the operator typed ("49", "$49.00", "1,299") into cents.
 * Returns null when the input isn't a usable number, so the caller can show a
 * validation error rather than silently storing 0 and giving the product away.
 */
export function parsePriceToCents(input: string): number | null {
	const cleaned = input.replace(/[^0-9.]/g, "");
	if (!cleaned) return null;
	const amount = Number.parseFloat(cleaned);
	if (!Number.isFinite(amount) || amount < 0) return null;
	return Math.round(amount * 100);
}
