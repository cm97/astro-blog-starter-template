import type { APIRoute } from "astro";
import { getProduct, upsertProduct } from "../../../lib/products";

export const prerender = false;

/**
 * Uploads a product's deliverable file into the private MY_PRODUCTS R2 bucket
 * and points the product at it.
 *
 * The bucket is never public — customers only ever reach a file through the
 * signed, expiring token minted by /api/webhook and redeemed at /api/download.
 */

/** Workers can stream a body of any size, but a stray huge upload is worth stopping. */
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB

function back(productId: string, params: Record<string, string>): Response {
	const query = new URLSearchParams(params);
	return new Response(null, {
		status: 303,
		headers: { Location: `/admin/products/${encodeURIComponent(productId)}?${query}` },
	});
}

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData();
	const productId = String(form.get("product_id") ?? "").trim();

	if (!productId) return new Response("Missing product id", { status: 400 });
	if (!env.DB) return back(productId, { error: "No database binding is configured." });
	if (!env.MY_PRODUCTS) return back(productId, { error: "No R2 bucket binding is configured." });

	const product = await getProduct(env.DB, productId);
	if (!product) return back(productId, { error: "That product no longer exists." });

	const file = form.get("file");
	if (!(file instanceof File) || file.size === 0) {
		return back(productId, { error: "Choose a file to upload." });
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		return back(productId, { error: "That file is larger than the 200 MB limit." });
	}

	// Keep the customer-facing filename readable but strip anything that could
	// escape the key prefix or break the Content-Disposition header.
	const safeName = file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120) || "download.zip";
	const r2Key = `products/${productId}/${safeName}`;

	try {
		await env.MY_PRODUCTS.put(r2Key, file.stream(), {
			httpMetadata: { contentType: file.type || "application/octet-stream" },
		});
	} catch (error) {
		console.error(`Buzzyfly admin: R2 upload failed for ${r2Key} —`, error);
		return back(productId, { error: "Upload failed. Check the Worker logs and try again." });
	}

	await upsertProduct(env.DB, {
		...product,
		r2Key,
		fileName: safeName,
		contentType: file.type || "application/octet-stream",
	});

	return back(productId, { notice: `Uploaded ${safeName}.` });
};
