// Pure helpers for the site feedback button. Kept framework-free so they're easy to unit test.

export const FEEDBACK_EMAIL = "feedback@example.com";
export const MAX_FEEDBACK_LENGTH = 2000;

export interface FeedbackData {
	message: string;
	email?: string;
	page?: string;
}

export interface FeedbackValidationResult {
	valid: boolean;
	error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateFeedback(data: FeedbackData): FeedbackValidationResult {
	const trimmedMessage = data.message?.trim() ?? "";

	if (!trimmedMessage) {
		return { valid: false, error: "Please enter your feedback before submitting." };
	}

	if (trimmedMessage.length > MAX_FEEDBACK_LENGTH) {
		return {
			valid: false,
			error: `Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.`,
		};
	}

	if (data.email && !EMAIL_PATTERN.test(data.email)) {
		return { valid: false, error: "Please enter a valid email address, or leave it blank." };
	}

	return { valid: true };
}

export function buildFeedbackMailtoUrl(data: FeedbackData, recipient: string = FEEDBACK_EMAIL): string {
	const subject = data.page ? `Feedback: ${data.page}` : "Feedback";
	const bodyLines = [data.message.trim()];

	if (data.email) {
		bodyLines.push("", `Reply to: ${data.email}`);
	}

	const body = bodyLines.join("\n");

	return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
