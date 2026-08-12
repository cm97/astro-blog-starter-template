import type { APIRoute } from "astro";

export const prerender = false;

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

function sanitizeFileName(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

/**
 * Uploads an image into the existing MY_PRODUCTS R2 bucket under a
 * `site-media/` prefix, kept separate from the private `products/` prefix
 * used for paid downloads (see ../download.ts). Files here are served back
 * out publicly by ../../media/[...key].ts.
 */
export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);
	const file = form?.get("file");

	if (!(file instanceof File)) {
		return new Response("No file uploaded", { status: 400 });
	}
	if (!ALLOWED_TYPES.has(file.type)) {
		return new Response(`Unsupported file type: ${file.type}`, { status: 400 });
	}
	if (file.size > MAX_BYTES) {
		return new Response("File is larger than 8MB", { status: 400 });
	}

	const key = `site-media/${Date.now()}-${sanitizeFileName(file.name || "upload")}`;
	await env.MY_PRODUCTS.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});

	return redirect("/admin?saved=media");
};
