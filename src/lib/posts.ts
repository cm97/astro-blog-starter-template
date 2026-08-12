export interface BlogPost {
	id: string;
	authorId: string;
	authorUsername: string;
	authorDisplayName: string;
	title: string;
	slug: string;
	bodyMarkdown: string;
	coverImageKey: string | null;
	videoKey: string | null;
	createdAt: number;
	updatedAt: number;
}

const POST_SELECT = `
	SELECT
		posts.id as id,
		posts.author_id as authorId,
		users.username as authorUsername,
		users.display_name as authorDisplayName,
		posts.title as title,
		posts.slug as slug,
		posts.body_markdown as bodyMarkdown,
		posts.cover_image_key as coverImageKey,
		posts.video_key as videoKey,
		posts.created_at as createdAt,
		posts.updated_at as updatedAt
	FROM posts JOIN users ON users.id = posts.author_id
`;

// Reads are defensive about a missing `posts`/`users` schema (e.g. the D1
// migration hasn't been applied to this environment yet) so the blog page
// degrades to "no reader posts" instead of a hard 500.

export async function listPosts(env: Env, limit = 40): Promise<BlogPost[]> {
	if (!env.DB) return [];
	try {
		const { results } = await env.DB.prepare(
			`${POST_SELECT} ORDER BY posts.created_at DESC LIMIT ?`,
		)
			.bind(limit)
			.all<BlogPost>();
		return results ?? [];
	} catch (error) {
		console.error("Buzzyfly blog: failed to list posts (migration applied?)", error);
		return [];
	}
}

export async function getPostBySlug(env: Env, slug: string): Promise<BlogPost | null> {
	if (!env.DB) return null;
	try {
		const row = await env.DB.prepare(`${POST_SELECT} WHERE posts.slug = ?`)
			.bind(slug)
			.first<BlogPost>();
		return row ?? null;
	} catch (error) {
		console.error("Buzzyfly blog: failed to load post by slug (migration applied?)", error);
		return null;
	}
}

export async function getPostById(env: Env, id: string): Promise<BlogPost | null> {
	if (!env.DB) return null;
	try {
		const row = await env.DB.prepare(`${POST_SELECT} WHERE posts.id = ?`).bind(id).first<BlogPost>();
		return row ?? null;
	} catch (error) {
		console.error("Buzzyfly blog: failed to load post by id (migration applied?)", error);
		return null;
	}
}

function slugify(title: string): string {
	const base = title
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return base || "post";
}

export interface CreatePostInput {
	id: string;
	authorId: string;
	title: string;
	bodyMarkdown: string;
	coverImageKey: string | null;
	videoKey: string | null;
}

export async function createPost(env: Env, input: CreatePostInput): Promise<string> {
	const id = input.id;
	const slug = `${slugify(input.title)}-${id.slice(0, 8)}`;
	const now = Date.now();

	await env.DB!.prepare(
		`INSERT INTO posts (id, author_id, title, slug, body_markdown, cover_image_key, video_key, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			id,
			input.authorId,
			input.title,
			slug,
			input.bodyMarkdown,
			input.coverImageKey,
			input.videoKey,
			now,
			now,
		)
		.run();

	return slug;
}

/** Deletes a post only if `authorId` owns it. Returns the deleted row (for R2 cleanup) or null. */
export async function deleteOwnedPost(
	env: Env,
	postId: string,
	authorId: string,
): Promise<BlogPost | null> {
	const post = await getPostById(env, postId);
	if (!post || post.authorId !== authorId) return null;

	await env.DB!.prepare(`DELETE FROM posts WHERE id = ? AND author_id = ?`)
		.bind(postId, authorId)
		.run();

	return post;
}

export function mediaUrl(key: string | null): string | null {
	return key ? `/media/${key}` : null;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
};

const VIDEO_EXTENSIONS: Record<string, string> = {
	"video/mp4": "mp4",
	"video/webm": "webm",
	"video/quicktime": "mov",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

export function imageExtension(contentType: string): string | null {
	return IMAGE_EXTENSIONS[contentType] ?? null;
}

export function videoExtension(contentType: string): string | null {
	return VIDEO_EXTENSIONS[contentType] ?? null;
}
