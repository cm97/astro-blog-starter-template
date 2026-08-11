// Pure helpers for the "search the web" box. Kept framework-free so they're easy to unit test.

export const SEARCH_ENGINE_URL = "https://duckduckgo.com/";

export function buildSearchUrl(query: string, baseUrl: string = SEARCH_ENGINE_URL): string | null {
	const trimmed = query.trim();

	if (!trimmed) {
		return null;
	}

	return `${baseUrl}?q=${encodeURIComponent(trimmed)}`;
}
