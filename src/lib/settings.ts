import { BUZZYFLY_CONFIG } from "../data/monetization";
import type { PatchableSettingsKey } from "./github";

export type SiteSettings = Record<PatchableSettingsKey, string>;

const DEFAULTS: SiteSettings = {
	brandName: BUZZYFLY_CONFIG.brandName,
	siteUrl: BUZZYFLY_CONFIG.siteUrl,
	defaultProductTitle: BUZZYFLY_CONFIG.defaultProductTitle,
	defaultProductPrice: BUZZYFLY_CONFIG.defaultProductPrice,
	defaultProductDescription: BUZZYFLY_CONFIG.defaultProductDescription,
	newsletterTitle: BUZZYFLY_CONFIG.newsletterTitle,
	newsletterDescription: BUZZYFLY_CONFIG.newsletterDescription,
};

// Editable settings live in the existing `site_content` key/value table rather
// than a second table of their own. That table is shared, so reads are
// filtered to the keys this module owns and writes only ever touch those keys —
// anything else stored there is left alone.
const SETTINGS_KEYS = Object.keys(DEFAULTS) as PatchableSettingsKey[];

function isSettingsKey(key: string): key is PatchableSettingsKey {
	return (SETTINGS_KEYS as string[]).includes(key);
}

/** Site settings as currently recorded in the admin console (D1), falling back to the shipped defaults. */
export async function getSettings(env: Env): Promise<SiteSettings> {
	if (!env.DB) return { ...DEFAULTS };

	try {
		const rows = await env.DB.prepare(`SELECT key, value FROM site_content`).all<{
			key: string;
			value: string;
		}>();
		const overrides = Object.fromEntries(
			(rows.results ?? []).filter((r) => isSettingsKey(r.key)).map((r) => [r.key, r.value]),
		);
		return { ...DEFAULTS, ...overrides };
	} catch (error) {
		console.error("Buzzyfly admin: failed to read settings from D1", error);
		return { ...DEFAULTS };
	}
}

/** Persists settings to D1 so the admin console has a record independent of whether GitHub is configured. */
export async function saveSettings(env: Env, updates: Partial<SiteSettings>): Promise<void> {
	if (!env.DB) return;
	const now = Date.now();
	for (const [key, value] of Object.entries(updates)) {
		if (value === undefined || !isSettingsKey(key)) continue;
		await env.DB.prepare(
			`INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
		)
			.bind(key, value, now)
			.run();
	}
}
