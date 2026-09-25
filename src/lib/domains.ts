export const TLDS = [
	{ tld: "com", price: 12.98, note: "The name people type first" },
	{ tld: "ai", price: 79.98, note: "Still reads as a product" },
	{ tld: "io", price: 36.98, note: "Short and familiar" },
	{ tld: "org", price: 11.98, note: "Groups and schools" },
	{ tld: "dev", price: 14.98, note: "Builders and tools" },
	{ tld: "app", price: 16.98, note: "Software you open" },
	{ tld: "studio", price: 22.98, note: "Shops and studios" },
	{ tld: "net", price: 13.98, note: "The old alternate" },
] as const;

export type Tld = (typeof TLDS)[number]["tld"];

const ALLOWED = new Set<string>(TLDS.map((item) => item.tld));

const FALLBACK_RDAP: Record<string, string> = {
	io: "https://rdap.identitydigital.services/rdap/",
};

export type Availability = "open" | "taken" | "unknown";

export type NameRow = {
	domain: string;
	stem: string;
	tld: string;
	price: number | null;
	line: string;
	availability: Availability;
};

type CacheEntry = { at: number; availability: Availability };
const cache = new Map<string, CacheEntry>();
const CACHE_MS = 10 * 60 * 1000;
let bootstrap: Map<string, string> | null = null;
let bootstrapAt = 0;

export function priceFor(tld: string): number | null {
	return TLDS.find((item) => item.tld === tld)?.price ?? null;
}

export function isLabel(value: string): boolean {
	if (value.length < 1 || value.length > 63) return false;
	return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
}

export function expandQuery(raw: string): { domains: string[]; error?: string } {
	const q = raw
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, "")
		.replace(/\/.*$/, "")
		.replace(/^www\./, "");
	if (!q) return { domains: [], error: "Type a name or a domain." };
	if (/\s/.test(q)) {
		return { domains: [], error: "Lookup wants one name. Use Invent for a sentence." };
	}
	if (q.includes(".")) {
		const dot = q.indexOf(".");
		const stem = q.slice(0, dot);
		const tld = q.slice(dot + 1);
		if (!isLabel(stem) || !/^[a-z]{2,24}$/.test(tld)) {
			return { domains: [], error: "That does not look like a domain." };
		}
		const domains = [`${stem}.${tld}`];
		for (const item of TLDS) {
			const next = `${stem}.${item.tld}`;
			if (!domains.includes(next)) domains.push(next);
		}
		return { domains: domains.slice(0, 9) };
	}
	if (!isLabel(q)) return { domains: [], error: "Use letters and numbers only." };
	return { domains: TLDS.map((item) => `${q}.${item.tld}`) };
}

function hash(value: string): number {
	let h = 2166136261;
	for (let i = 0; i < value.length; i += 1) {
		h ^= value.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function compose(brief: string): Array<{ stem: string; tld: Tld; line: string }> {
	const starts = ["vel", "or", "lum", "arc", "hal", "nor", "sol", "ke", "mar", "fen", "cal", "tor", "nov", "ser", "ald", "bri"];
	const ends = ["ora", "el", "en", "is", "um", "an", "io", "a", "ow", "et", "ine", "os"];
	const tlds: Tld[] = ["com", "com", "ai", "io", "org", "dev", "studio", "app"];
	const seed = hash(brief.toLowerCase());
	const words = brief
		.toLowerCase()
		.replace(/[^a-z\s]/g, " ")
		.split(/\s+/)
		.filter((word) => word.length > 3)
		.slice(0, 4);
	const used = new Set<string>();
	const names: Array<{ stem: string; tld: Tld; line: string }> = [];
	for (let i = 0; names.length < 8 && i < 24; i += 1) {
		const start = starts[(seed + i * 3) % starts.length];
		const end = ends[(seed + i * 5) % ends.length];
		const hint = words.length > 0 ? words[(seed + i) % words.length].slice(0, 4) : "";
		const stem = (i % 2 === 0 && hint ? `${hint.slice(0, 3)}${end}` : `${start}${end}`)
			.replace(/[^a-z]/g, "")
			.slice(0, 12);
		if (stem.length < 4 || used.has(stem) || !isLabel(stem)) continue;
		used.add(stem);
		const tld = tlds[names.length % tlds.length];
		names.push({
			stem,
			tld,
			line: `A short mark for ${words[0] ?? "the work"}.`,
		});
	}
	return names;
}

async function rdapBase(tld: string): Promise<string | null> {
	const fresh = bootstrap && Date.now() - bootstrapAt < 12 * 60 * 60 * 1000;
	if (!fresh) {
		try {
			const response = await fetch("https://data.iana.org/rdap/dns.json", {
				headers: { Accept: "application/json", "User-Agent": "BuzzyflyDomains/1.0" },
			});
			if (response.ok) {
				const data = (await response.json()) as { services?: [string[], string[]][] };
				const map = new Map<string, string>();
				for (const pair of data.services ?? []) {
					const [names, urls] = pair;
					const raw = urls[0];
					if (!raw) continue;
					const base = raw.endsWith("/") ? raw : `${raw}/`;
					for (const name of names) map.set(name.toLowerCase(), base);
				}
				bootstrap = map;
				bootstrapAt = Date.now();
			}
		} catch {
			/* keep the last map */
		}
	}
	return bootstrap?.get(tld) ?? FALLBACK_RDAP[tld] ?? null;
}

async function lookupRdap(domain: string): Promise<Availability> {
	const hit = cache.get(domain);
	if (hit && Date.now() - hit.at < CACHE_MS) return hit.availability;
	const tld = domain.slice(domain.lastIndexOf(".") + 1);
	const base = await rdapBase(tld);
	if (!base) return "unknown";
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);
	let availability: Availability = "unknown";
	try {
		const response = await fetch(`${base}domain/${encodeURIComponent(domain)}`, {
			redirect: "follow",
			signal: controller.signal,
			headers: {
				Accept: "application/rdap+json, application/json",
				"User-Agent": "BuzzyflyDomains/1.0",
			},
		});
		if (response.status === 404) availability = "open";
		else if (response.status === 200) availability = "taken";
	} catch {
		availability = "unknown";
	} finally {
		clearTimeout(timer);
	}
	if (availability !== "unknown") cache.set(domain, { at: Date.now(), availability });
	return availability;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let cursor = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (cursor < items.length) {
				const index = cursor;
				cursor += 1;
				out[index] = await fn(items[index]);
			}
		}),
	);
	return out;
}

async function withAvailability(ideas: Array<{ stem: string; tld: string; line: string }>): Promise<NameRow[]> {
	const rows = await mapPool(ideas, 4, async (idea) => {
		const domain = `${idea.stem}.${idea.tld}`;
		const availability = await lookupRdap(domain);
		return {
			domain,
			stem: idea.stem,
			tld: idea.tld,
			price: priceFor(idea.tld),
			line: idea.line,
			availability,
		} satisfies NameRow;
	});
	return rows;
}

const BANNED = new Set([
	"software",
	"studio",
	"digital",
	"cloud",
	"online",
	"domain",
	"website",
	"company",
	"brand",
	"smart",
	"tech",
	"design",
	"media",
	"group",
	"global",
	"creative",
	"solutions",
	"app",
]);

function parseModelNames(text: string): Array<{ stem: string; tld: Tld; line: string }> {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start < 0 || end <= start) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(text.slice(start, end + 1));
	} catch {
		return [];
	}
	if (typeof parsed !== "object" || parsed === null || !("names" in parsed)) return [];
	const names = (parsed as { names: unknown }).names;
	if (!Array.isArray(names)) return [];
	const used = new Set<string>();
	const ideas: Array<{ stem: string; tld: Tld; line: string }> = [];
	for (const item of names) {
		if (typeof item !== "object" || item === null) continue;
		const stemRaw = "stem" in item && typeof item.stem === "string" ? item.stem : "";
		const tldRaw = "tld" in item && typeof item.tld === "string" ? item.tld : "";
		const lineRaw = "line" in item && typeof item.line === "string" ? item.line : "";
		const stem = stemRaw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
		const tld = tldRaw.toLowerCase().replace(/^\./, "");
		if (!isLabel(stem) || stem.length < 4 || BANNED.has(stem) || !ALLOWED.has(tld) || used.has(stem)) continue;
		used.add(stem);
		ideas.push({
			stem,
			tld: tld as Tld,
			line: lineRaw.replace(/\s+/g, " ").trim().slice(0, 90) || "A name with room to grow.",
		});
		if (ideas.length === 8) break;
	}
	return ideas;
}

async function inventWithModel(brief: string, apiKey: string) {
	const endings = TLDS.map((item) => item.tld).join(", ");
	const messages = [
		{
			role: "system",
			content:
				'You name companies. Reply with JSON only: {"names":[{"stem":"brandableword","tld":"com","line":"why, under 12 words"}]} ' +
				`Exactly 8 names. stem is one pronounceable label, 5 to 11 letters, no hyphens, not a famous trademark. tld is one of: ${endings}. At least three are com. ` +
				"line is concrete.",
		},
		{ role: "user", content: brief },
	];
	const send = async (jsonMode: boolean) => {
		const body: Record<string, unknown> = {
			model: "grok-4.5",
			temperature: 0.85,
			max_tokens: 700,
			messages,
		};
		if (jsonMode) body.response_format = { type: "json_object" };
		return fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
			body: JSON.stringify(body),
		});
	};
	let response = await send(true);
	if (!response.ok && response.status !== 429) response = await send(false);
	if (!response.ok) return null;
	const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
	const ideas = parseModelNames(payload.choices?.[0]?.message?.content ?? "");
	return ideas.length >= 4 ? ideas : null;
}

export async function inventNames(brief: string, apiKey: string | undefined) {
	let source: "model" | "composer" = "composer";
	let ideas = compose(brief);
	let note = "Composed on the desk.";
	if (apiKey) {
		try {
			const modeled = await inventWithModel(brief, apiKey);
			if (modeled && modeled.length > 0) {
				ideas = modeled;
				source = "model";
				note = "";
			}
		} catch {
			note = "The naming model did not answer, so the desk composed these.";
		}
	}
	const names = await withAvailability(ideas);
	return { ok: true as const, source, note, names };
}

export async function checkNames(query: string) {
	const plan = expandQuery(query);
	if (plan.error || plan.domains.length === 0) {
		return { ok: false as const, error: plan.error ?? "Nothing to check." };
	}
	const names = await mapPool(plan.domains, 4, async (domain) => {
		const dot = domain.lastIndexOf(".");
		const stem = domain.slice(0, dot);
		const tld = domain.slice(dot + 1);
		return {
			domain,
			stem,
			tld,
			price: priceFor(tld),
			line: "",
			availability: await lookupRdap(domain),
		} satisfies NameRow;
	});
	return { ok: true as const, source: "registry" as const, note: "", names };
}
