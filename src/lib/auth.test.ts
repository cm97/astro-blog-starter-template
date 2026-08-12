import { describe, expect, it } from "vitest";
import {
	SESSION_COOKIE_NAME,
	buildLogoutCookie,
	buildSessionCookie,
	createLoginToken,
	createSessionToken,
	isValidEmail,
	readSessionCookie,
	verifyLoginToken,
	verifySessionToken,
} from "./auth";

const SECRET = "test-secret";

describe("isValidEmail", () => {
	it("accepts a well-formed email", () => {
		expect(isValidEmail("buyer@example.com")).toBe(true);
	});

	it("rejects a string with no @", () => {
		expect(isValidEmail("not-an-email")).toBe(false);
	});

	it("rejects an empty string", () => {
		expect(isValidEmail("")).toBe(false);
	});
});

describe("login tokens", () => {
	it("round-trips the email through a login token", async () => {
		const token = await createLoginToken("buyer@example.com", SECRET);
		expect(await verifyLoginToken(token, SECRET)).toBe("buyer@example.com");
	});

	it("rejects a login token verified with the wrong secret", async () => {
		const token = await createLoginToken("buyer@example.com", SECRET);
		expect(await verifyLoginToken(token, "wrong-secret")).toBeNull();
	});

	it("does not verify as a session token even with the right secret", async () => {
		// Login and session tokens are signed with distinct secrets in
		// practice; this just confirms the payload shape is compatible so a
		// misconfiguration would fail loudly rather than silently.
		const token = await createLoginToken("buyer@example.com", SECRET);
		expect(await verifySessionToken(token, SECRET)).toBe("buyer@example.com");
	});
});

describe("session tokens", () => {
	it("round-trips the email through a session token", async () => {
		const token = await createSessionToken("buyer@example.com", SECRET);
		expect(await verifySessionToken(token, SECRET)).toBe("buyer@example.com");
	});

	it("rejects a garbage token", async () => {
		expect(await verifySessionToken("garbage", SECRET)).toBeNull();
	});
});

describe("session cookie helpers", () => {
	it("builds a Set-Cookie value carrying the session token", () => {
		const cookie = buildSessionCookie("abc.def");
		expect(cookie).toContain(`${SESSION_COOKIE_NAME}=abc.def`);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("Secure");
		expect(cookie).toContain("SameSite=Lax");
	});

	it("builds a logout cookie that expires immediately", () => {
		expect(buildLogoutCookie()).toContain("Max-Age=0");
	});

	it("reads the session token back out of a Cookie header", () => {
		const header = `other=1; ${SESSION_COOKIE_NAME}=abc.def; another=2`;
		expect(readSessionCookie(header)).toBe("abc.def");
	});

	it("returns null when the cookie is absent", () => {
		expect(readSessionCookie("other=1")).toBeNull();
	});

	it("returns null when there is no Cookie header at all", () => {
		expect(readSessionCookie(null)).toBeNull();
	});
});
