import { BUZZYFLY_CONFIG } from "../data/monetization";

/** The questions a done-for-you buyer answers so the setup can be written for them. */
export const INTAKE_QUESTIONS = [
	"What do you sell, and who buys it? (one or two sentences)",
	"Your prices or packages, as you quote them today.",
	"How does a new client reach you, and what happens next today?",
	"Paste one welcome or follow-up email you've already sent, if you have one.",
	"Which days and hours do you work? Anything fixed each week (calls, school run, other job)?",
	"Where do you keep client info today? (Gmail, Notion, Google Docs, paper...)",
	"Two or three times that would suit you for the 30-minute handover call, with your time zone.",
];

/** Prefilled email the buyer sends back with their answers. */
export function intakeMailto(orderId: string): string {
	const subject = `Setup intake — order ${orderId}`;
	const body = INTAKE_QUESTIONS.map((q, i) => `${i + 1}. ${q}\n\n`).join("\n");
	return `mailto:${BUZZYFLY_CONFIG.orderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
