import { describe, expect, it } from "vitest";
import { SEARCH_ENGINE_URL, buildSearchUrl } from "./search";

describe("buildSearchUrl", () => {
	it("returns null for an empty query", () => {
		expect(buildSearchUrl("")).toBeNull();
	});

	it("returns null for a whitespace-only query", () => {
		expect(buildSearchUrl("   \n\t  ")).toBeNull();
	});

	it("builds a URL against the default search engine", () => {
		const url = buildSearchUrl("astro blog");
		expect(url).toBe(`${SEARCH_ENGINE_URL}?q=astro%20blog`);
	});

	it("trims surrounding whitespace before encoding", () => {
		const url = buildSearchUrl("  astro blog  ");
		expect(url).toBe(`${SEARCH_ENGINE_URL}?q=astro%20blog`);
	});

	it("percent-encodes special characters", () => {
		const url = buildSearchUrl("C++ & Rust?");
		expect(url).toBe(`${SEARCH_ENGINE_URL}?q=${encodeURIComponent("C++ & Rust?")}`);
	});

	it("uses a custom base URL when provided", () => {
		const url = buildSearchUrl("cats", "https://www.google.com/search");
		expect(url).toBe("https://www.google.com/search?q=cats");
	});
});
