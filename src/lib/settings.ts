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

/** Site settings as currently recorded in the admin console (D1), falling back to the shipped defaults. */
export async function getSettings(env: Env): Promise<SiteSettings> {
	if (!env.DB) return { ...DEFAULTS };

	try {
		const rows = await env.DB.prepare(`SELECT key, value FROM settings`).all<{
			key: string;
			value: string;
		}>();
		const overrides = Object.fromEntries((rows.results ?? []).map((r) => [r.key, r.value]));
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
		if (value === undefined) continue;
		await env.DB.prepare(
			`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
		)
			.bind(key, value, now)
			.run();
	}
}
