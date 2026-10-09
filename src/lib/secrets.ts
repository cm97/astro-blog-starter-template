/**
 * SHA-256 hashes of secret values that were once committed to this public repo
 * (wrangler.json `vars`, commit c8e4374, removed in 8db3ca7). Anyone can read them
 * from git history, so a Worker still configured with one of them would accept
 * forged download tokens or forged Stripe webhooks. Treat such a value as unset
 * and fail closed until the owner rotates it with `wrangler secret put`.
 */
const LEAKED_SECRET_SHA256 = new Set<string>([
	"b8646af9e1b1e385bad1c8052b7eb4450b4e9be98e25a7eedd364a5737466477", // old DOWNLOAD_TOKEN_SECRET
	"6fc33d4db9d48bf9d8fa9339c7bf5022914de469ce3d058f5e874cb3bc8546fd", // old STRIPE_WEBHOOK_SECRET
]);

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Returns the secret if it is set and not a known-leaked value, otherwise undefined. */
export async function usableSecret(value: string | undefined): Promise<string | undefined> {
	if (!value) return undefined;
	if (LEAKED_SECRET_SHA256.has(await sha256Hex(value))) {
		console.error("Buzzyfly: a secret is set to a value leaked in git history; ignoring it. Rotate it with `wrangler secret put`.");
		return undefined;
	}
	return value;
}
