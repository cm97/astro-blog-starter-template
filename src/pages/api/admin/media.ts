import type { APIRoute } from "astro";
import {
	ALLOWED_EXTENSIONS,
	MAX_UPLOAD_BYTES,
	contentTypeFor,
	formatBytes,
	resolvePublicKey,
	safeMediaName,
	uniqueMediaName,
} from "../../../lib/media";
import { logAdminAction } from "../../../lib/audit";

export const prerender = false;

function back(params: URLSearchParams): Response {
	return new Response(null, { status: 303, headers: { Location: `/admin/media?${params}` } });
}

function fail(message: string): Response {
	return back(new URLSearchParams({ error: message }));
}

/**
 * Uploads a file into the public media prefix of the R2 bucket.
 *
 * The filename is never trusted: `safeMediaName` reduces it to a flat,
 * allowlisted name, and `resolvePublicKey` is the only thing that turns that
 * into a bucket key. An upload therefore cannot land under `products/` and
 * overwrite something customers paid for.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;

	const form = await request.formData().catch(() => null);
	const file = form?.get("file");

	if (!file || typeof file === "string") {
		return fail("Choose a file to upload.");
	}

	if (file.size === 0) return fail("That file is empty.");
	if (file.size > MAX_UPLOAD_BYTES) {
		return fail(`That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`);
	}

	const safeName = safeMediaName(file.name);
	if (!safeName) {
		return fail(`That file type isn't allowed. Supported: ${ALLOWED_EXTENSIONS.join(", ")}.`);
	}

	const name = await uniqueMediaName(env.MY_PRODUCTS, safeName);
	const key = resolvePublicKey(name);
	if (!key) return fail("Could not build a safe name for that file.");

	try {
		// R2 rejects a stream of unknown length, which is what File.stream()
		// gives, so the body is buffered first. MAX_UPLOAD_BYTES is set low
		// enough that this stays inside the Worker's memory budget.
		const body = await file.arrayBuffer();
		await env.MY_PRODUCTS.put(key, body, {
			httpMetadata: {
				contentType: contentTypeFor(name) ?? "application/octet-stream",
			},
		});
	} catch (error) {
		console.error("Buzzyfly admin: media upload failed", error);
		return fail("Upload failed. Please try again.");
	}

	await logAdminAction(env, locals.adminUser ?? "unknown", "media_upload", name);

	return back(new URLSearchParams({ uploaded: name }));
};
