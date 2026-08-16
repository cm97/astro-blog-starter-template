import type { APIRoute } from "astro";
import {
	deleteProduct,
	getProduct,
	parsePriceToCents,
	setItemIds,
	slugify,
	upsertProduct,
	type ProductStatus,
} from "../../../lib/products";

export const prerender = false;

// Access is enforced by src/middleware.ts, which rejects any unauthenticated
// request to /api/admin/* before it reaches this handler.

function redirect(to: string): Response {
	return new Response(null, { status: 303, headers: { Location: to } });
}

function fail(message: string, productId?: string): Response {
	const target = productId
		? `/admin/products/${encodeURIComponent(productId)}`
		: "/admin/products/new";
	return redirect(`${target}?error=${encodeURIComponent(message)}`);
}

/** Splits a textarea into trimmed, non-empty lines. */
function lines(value: FormDataEntryValue | null): string[] {
	return String(value ?? "")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	if (!env.DB) return fail("No database binding is configured for this deployment.");

	const form = await request.formData();
	const action = String(form.get("_action") ?? "save");

	// ---------------------------------------------------------------- delete
	if (action === "delete") {
		const id = String(form.get("id") ?? "").trim();
		if (!id) return redirect("/admin/products?error=Missing+product+id");

		await deleteProduct(env.DB, id);
		return redirect(
			`/admin/products?notice=${encodeURIComponent(`Deleted "${id}". The file in R2 was left in place.`)}`,
		);
	}

	// ------------------------------------------------------------------ save
	// `originalId` is empty when creating. When it is set and the slug changed,
	// this is a rename, handled below as create-then-delete.
	const originalId = String(form.get("original_id") ?? "").trim();
	const title = String(form.get("title") ?? "").trim();
	if (!title) return fail("Give the product a title.", originalId || undefined);

	const requestedSlug = String(form.get("slug") ?? "").trim();
	const id = slugify(requestedSlug || title);
	if (!id) return fail("Could not build a valid URL slug from that title.", originalId || undefined);

	const priceCents = parsePriceToCents(String(form.get("price") ?? ""));
	if (priceCents === null) {
		return fail("Enter a price as a number, for example 49 or 49.00.", originalId || undefined);
	}

	// Creating a product that would silently overwrite an unrelated one is a
	// data-loss bug, so a slug collision on create is rejected outright.
	if (!originalId || originalId !== id) {
		const clash = await getProduct(env.DB, id);
		if (clash) {
			return fail(
				`A product with the slug "${id}" already exists. Choose a different slug.`,
				originalId || undefined,
			);
		}
	}

	const statusValue = String(form.get("status") ?? "draft");
	const status: ProductStatus = statusValue === "active" ? "active" : "draft";

	const checkoutUrl = String(form.get("checkout_url") ?? "").trim() || null;
	// A published product with no checkout link renders a dead "Coming soon"
	// card, which is almost never what "publish" was meant to do.
	if (status === "active" && !checkoutUrl) {
		return fail(
			"Add a checkout link before publishing, or save this as a draft.",
			originalId || undefined,
		);
	}

	const sortOrderRaw = Number.parseInt(String(form.get("sort_order") ?? "0"), 10);

	// Carry over any file already attached, since the upload form is separate
	// from this one and must not be wiped by an unrelated edit.
	const existing = originalId ? await getProduct(env.DB, originalId) : null;

	await upsertProduct(env.DB, {
		id,
		title,
		summary: String(form.get("summary") ?? "").trim(),
		description: String(form.get("description") ?? "").trim(),
		features: lines(form.get("features")),
		priceCents,
		currency: (String(form.get("currency") ?? "USD").trim().toUpperCase() || "USD").slice(0, 3),
		checkoutUrl,
		r2Key: existing?.r2Key ?? null,
		fileName: existing?.fileName ?? null,
		contentType: existing?.contentType ?? "application/zip",
		status,
		sortOrder: Number.isFinite(sortOrderRaw) ? sortOrderRaw : 0,
	});

	await setItemIds(env.DB, id, lines(form.get("item_ids")));

	// Renaming the slug: the new row is written first, then the old one removed,
	// so an interruption leaves a duplicate rather than nothing.
	if (originalId && originalId !== id) {
		await deleteProduct(env.DB, originalId);
	}

	return redirect(
		`/admin/products/${encodeURIComponent(id)}?notice=${encodeURIComponent("Saved.")}`,
	);
};
