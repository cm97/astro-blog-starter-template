// Media library storage.
//
// The `MY_PRODUCTS` R2 bucket holds two very different kinds of object:
//
//   products/…   files customers PAY for. Never public. Served only by
//                /api/download, and only against a valid download token.
//   public/…     site media (images, PDFs, short clips) that is meant to be
//                linked from posts and pages, and is served to anyone.
//
// Everything in this module is built around keeping those apart. Public
// reads are confined to PUBLIC_PREFIX by construction: callers pass a
// relative key, never a bucket key, and `resolvePublicKey` is the only way to
// turn one into the other. A bug that leaks a paid product would cost real
// money, so the checks here are deliberately strict rather than clever.

export const PUBLIC_PREFIX = "public/";

/** Extensions we are willing to store and serve, mapped to the type we serve them as. */
const ALLOWED_TYPES: Record<string, string> = {
	// images
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	svg: "image/svg+xml",
	// documents
	pdf: "application/pdf",
	txt: "text/plain",
	csv: "text/csv",
	// short video / audio
	mp4: "video/mp4",
	webm: "video/webm",
	mov: "video/quicktime",
	mp3: "audio/mpeg",
	wav: "audio/wav",
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_TYPES);

/**
 * Upload ceiling.
 *
 * R2 will not accept a body of unknown length, so an upload is buffered in
 * memory before being written. A Worker gets 128 MB of memory total, so this
 * stays well clear of it. Generous for images and documents; long video should
 * be embedded from YouTube or Vimeo rather than uploaded here.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface MediaItem {
	/** Key relative to PUBLIC_PREFIX — what the admin UI and public URLs use. */
	name: string;
	/** Public URL path this object is served from. */
	url: string;
	size: number;
	uploadedAt: number;
	contentType: string;
	isImage: boolean;
}

function extensionOf(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export function contentTypeFor(name: string): string | null {
	return ALLOWED_TYPES[extensionOf(name)] ?? null;
}

/**
 * Normalises a user-supplied filename into a safe, flat storage name.
 *
 * Strips any directory component outright rather than trying to sanitise a
 * path, so `../products/secret.zip` becomes `secret.zip` and cannot climb out
 * of the public prefix. Returns null when nothing usable is left or the
 * extension is not allowed.
 */
export function safeMediaName(rawName: string): string | null {
	// Take the last path segment only — kills ../, /, and Windows \ traversal.
	const base = rawName.split(/[\\/]/).pop() ?? "";

	const cleaned = base
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/-{2,}/g, "-")
		.replace(/^[-.]+/, "")
		.slice(0, 120);

	if (!cleaned || cleaned === "." || !contentTypeFor(cleaned)) return null;
	return cleaned;
}

/**
 * Turns a relative media name into its bucket key, or null if the name tries
 * to escape the public prefix. The only sanctioned way to address a public
 * object — nothing else in the codebase should concatenate PUBLIC_PREFIX by hand.
 */
export function resolvePublicKey(relativeName: string): string | null {
	if (!relativeName) return null;
	// Reject anything with a path separator, a traversal segment, or a null byte
	// before it ever reaches R2.
	if (/[\\/]/.test(relativeName)) return null;
	if (relativeName.includes("..") || relativeName.includes("\0")) return null;
	if (!contentTypeFor(relativeName)) return null;

	const key = PUBLIC_PREFIX + relativeName;
	// Belt and braces: the composed key must still sit under the public prefix.
	if (!key.startsWith(PUBLIC_PREFIX)) return null;
	return key;
}

/** Gives a unique name when one is already taken, e.g. logo.png -> logo-2.png. */
export async function uniqueMediaName(bucket: R2Bucket, name: string): Promise<string> {
	const dot = name.lastIndexOf(".");
	const stem = dot === -1 ? name : name.slice(0, dot);
	const ext = dot === -1 ? "" : name.slice(dot);

	for (let n = 1; n < 100; n++) {
		const candidate = n === 1 ? name : `${stem}-${n}${ext}`;
		const key = resolvePublicKey(candidate);
		if (!key) break;
		if (!(await bucket.head(key))) return candidate;
	}
	return `${stem}-${Date.now()}${ext}`;
}

/** Lists everything in the public prefix, newest first. */
export async function listMedia(bucket: R2Bucket, limit = 500): Promise<MediaItem[]> {
	const listed = await bucket.list({ prefix: PUBLIC_PREFIX, limit, include: ["httpMetadata"] });

	return listed.objects
		.map((object) => {
			const name = object.key.slice(PUBLIC_PREFIX.length);
			const contentType =
				object.httpMetadata?.contentType ?? contentTypeFor(name) ?? "application/octet-stream";
			return {
				name,
				url: `/media/${name}`,
				size: object.size,
				uploadedAt: object.uploaded.getTime(),
				contentType,
				isImage: contentType.startsWith("image/"),
			};
		})
		.sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
