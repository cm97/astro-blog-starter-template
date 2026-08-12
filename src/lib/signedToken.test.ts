import { describe, expect, it } from "vitest";
import { signPayload, verifyPayload } from "./signedToken";

const SECRET = "test-secret";

describe("signPayload / verifyPayload", () => {
	it("round-trips a payload", async () => {
		const token = await signPayload({ hello: "world" }, SECRET, 60);
		const payload = await verifyPayload(token, SECRET);
		expect(payload?.hello).toBe("world");
	});

	it("stamps an expiry derived from the given ttl", async () => {
		const before = Math.floor(Date.now() / 1000);
		const token = await signPayload({}, SECRET, 60);
		const payload = await verifyPayload(token, SECRET);
		expect(payload?.exp).toBeGreaterThanOrEqual(before + 60);
		expect(payload?.exp).toBeLessThanOrEqual(before + 61);
	});

	it("rejects a token signed with a different secret", async () => {
		const token = await signPayload({ hello: "world" }, SECRET, 60);
		expect(await verifyPayload(token, "wrong-secret")).toBeNull();
	});

	it("rejects an expired token", async () => {
		const token = await signPayload({ hello: "world" }, SECRET, -1);
		expect(await verifyPayload(token, SECRET)).toBeNull();
	});

	it("rejects a tampered payload", async () => {
		const token = await signPayload({ hello: "world" }, SECRET, 60);
		const [payloadPart, signaturePart] = token.split(".");
		const tamperedPayload = Buffer.from(JSON.stringify({ hello: "mallory" })).toString("base64url");
		expect(await verifyPayload(`${tamperedPayload}.${signaturePart}`, SECRET)).toBeNull();
		void payloadPart;
	});

	it("rejects a malformed token", async () => {
		expect(await verifyPayload("not-a-token", SECRET)).toBeNull();
		expect(await verifyPayload("", SECRET)).toBeNull();
	});
});
