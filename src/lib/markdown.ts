import { marked } from "marked";

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/** Allows same-site relative URLs (e.g. `/media/...`) plus a small allowlist of protocols. */
function sanitizeUrl(href: string): string | null {
	const trimmed = href.trim();
	if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
	try {
		const url = new URL(trimmed, "https://placeholder.invalid");
		if (!SAFE_URL_PROTOCOLS.has(url.protocol)) return null;
		return trimmed;
	} catch {
		return null;
	}
}

function escapeAttr(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

marked.use({
	gfm: true,
	breaks: true,
	tokenizer: {
		// Reject raw HTML at the tokenizer level (both block- and inline-level)
		// so anything a reader types that looks like a tag falls through to
		// plain, auto-escaped text instead of being emitted verbatim.
		html() {
			return undefined;
		},
		tag() {
			return undefined;
		},
	},
	renderer: {
		html() {
			return "";
		},
		link({ href, title, tokens }) {
			const text = this.parser.parseInline(tokens);
			const safeHref = sanitizeUrl(href);
			if (!safeHref) return text;
			const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
			return `<a href="${escapeAttr(safeHref)}"${titleAttr} rel="ugc noopener noreferrer" target="_blank">${text}</a>`;
		},
		image({ href, title, text }) {
			const safeHref = sanitizeUrl(href);
			if (!safeHref) return escapeAttr(text);
			const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
			return `<img src="${escapeAttr(safeHref)}" alt="${escapeAttr(text)}"${titleAttr} loading="lazy">`;
		},
	},
});

/** Renders reader-authored Markdown to sanitized HTML (raw HTML is never passed through). */
export function renderMarkdown(markdown: string): string {
	return marked.parse(markdown, { async: false }) as string;
}

/** Strips Markdown syntax down to a short plain-text teaser for feed cards. */
export function markdownToExcerpt(markdown: string, maxLength = 220): string {
	const plain = markdown
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[#>*_`~-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (plain.length <= maxLength) return plain;
	return `${plain.slice(0, maxLength).trimEnd()}…`;
}
