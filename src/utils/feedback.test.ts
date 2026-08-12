import { describe, expect, it } from "vitest";
import {
	FEEDBACK_EMAIL,
	MAX_FEEDBACK_LENGTH,
	buildFeedbackMailtoUrl,
	validateFeedback,
} from "./feedback";

describe("validateFeedback", () => {
	it("rejects an empty message", () => {
		const result = validateFeedback({ message: "" });
		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/enter your feedback/i);
	});

	it("rejects a message that is only whitespace", () => {
		const result = validateFeedback({ message: "   \n\t  " });
		expect(result.valid).toBe(false);
	});

	it("accepts a non-empty message with no email", () => {
		const result = validateFeedback({ message: "Love the blog!" });
		expect(result).toEqual({ valid: true });
	});

	it("rejects a message longer than the max length", () => {
		const result = validateFeedback({ message: "a".repeat(MAX_FEEDBACK_LENGTH + 1) });
		expect(result.valid).toBe(false);
		expect(result.error).toMatch(new RegExp(`${MAX_FEEDBACK_LENGTH}`));
	});

	it("accepts a message exactly at the max length", () => {
		const result = validateFeedback({ message: "a".repeat(MAX_FEEDBACK_LENGTH) });
		expect(result.valid).toBe(true);
	});

	it("accepts a valid email alongside the message", () => {
		const result = validateFeedback({ message: "Hi", email: "reader@example.com" });
		expect(result.valid).toBe(true);
	});

	it("rejects an invalid email", () => {
		const result = validateFeedback({ message: "Hi", email: "not-an-email" });
		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/valid email/i);
	});

	it("treats an empty email string as no email", () => {
		const result = validateFeedback({ message: "Hi", email: "" });
		expect(result.valid).toBe(true);
	});
});

describe("buildFeedbackMailtoUrl", () => {
	it("builds a mailto link to the default recipient", () => {
		const url = buildFeedbackMailtoUrl({ message: "Great post" });
		expect(url.startsWith(`mailto:${FEEDBACK_EMAIL}?`)).toBe(true);
	});

	it("uses a custom recipient when provided", () => {
		const url = buildFeedbackMailtoUrl({ message: "Great post" }, "custom@example.com");
		expect(url.startsWith("mailto:custom@example.com?")).toBe(true);
	});

	it("includes the trimmed message in the body", () => {
		const url = buildFeedbackMailtoUrl({ message: "  Great post  " });
		expect(url).toContain(encodeURIComponent("Great post"));
	});

	it("includes the page in the subject when provided", () => {
		const url = buildFeedbackMailtoUrl({ message: "Hi", page: "/blog/my-post" });
		expect(url).toContain(encodeURIComponent("Feedback: /blog/my-post"));
	});

	it("falls back to a generic subject when no page is provided", () => {
		const url = buildFeedbackMailtoUrl({ message: "Hi" });
		expect(url).toContain(`subject=${encodeURIComponent("Feedback")}`);
	});

	it("appends a reply-to line when an email is provided", () => {
		const url = buildFeedbackMailtoUrl({ message: "Hi", email: "reader@example.com" });
		const decodedBody = decodeURIComponent(url.split("body=")[1]);
		expect(decodedBody).toContain("Reply to: reader@example.com");
	});

	it("omits the reply-to line when no email is provided", () => {
		const url = buildFeedbackMailtoUrl({ message: "Hi" });
		const decodedBody = decodeURIComponent(url.split("body=")[1]);
		expect(decodedBody).not.toContain("Reply to:");
	});
});
