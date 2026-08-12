import type { APIRoute } from "astro";
import { saveSettings } from "../../../lib/settings";
import {
	getFile,
	getGitHubConfig,
	MONETIZATION_CONFIG_PATH,
	patchMonetizationConfig,
	type PatchableSettingsKey,
	putFile,
} from "../../../lib/github";
import { logAdminAction } from "../../../lib/audit";

export const prerender = false;

const KEYS: PatchableSettingsKey[] = [
	"brandName",
	"siteUrl",
	"defaultProductTitle",
	"defaultProductPrice",
	"defaultProductDescription",
	"newsletterTitle",
	"newsletterDescription",
];

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);

	const updates: Partial<Record<PatchableSettingsKey, string>> = {};
	for (const key of KEYS) {
		const value = String(form?.get(key) ?? "").trim();
		if (!value) {
			return redirect({ error: `${key} is required.` });
		}
		updates[key] = value;
	}

	await saveSettings(env, updates);
	await logAdminAction(env, locals.adminUser ?? "unknown", "settings_update");

	const githubConfig = getGitHubConfig(env);
	if (!githubConfig) return redirect({ status: "saved" });

	try {
		const file = await getFile(githubConfig, MONETIZATION_CONFIG_PATH);
		if (!file) return redirect({ status: "saved", error: "Saved, but src/data/monetization.ts wasn't found to publish to." });

		const patched = patchMonetizationConfig(file.content, updates);
		await putFile(githubConfig, MONETIZATION_CONFIG_PATH, patched, "Update site settings", file.sha);
		return redirect({ status: "published" });
	} catch (error) {
		console.error("Buzzyfly admin: failed to publish settings to GitHub", error);
		return redirect({ status: "saved", error: "Saved to admin records, but publishing to the repo failed." });
	}
};

function redirect(params: Record<string, string>): Response {
	const search = new URLSearchParams(params);
	return new Response(null, { status: 303, headers: { Location: `/admin/settings?${search}` } });
}
