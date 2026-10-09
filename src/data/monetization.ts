// Centralized Buzzyfly monetization branding and configuration.
// Import from here anywhere a product callout, opt-in form, or fulfillment
// endpoint needs consistent Buzzyfly copy or defaults.

export const BUZZYFLY_CONFIG = {
	brandName: "Buzzyfly",
	siteUrl: "https://buzzyfly.com",
	defaultProductTitle: "Buzzyfly Digital System",
	defaultProductPrice: "$49",
	defaultProductDescription:
		"Onboarding, weekly planning, and follow-ups as checklists you run in 20 minutes — so the process still exists on the weeks you are slammed.",
	newsletterTitle: "Send me the 20-minute weekly reset checklist",
	newsletterDescription:
		"Free. No spam. Just the checklist, plus one email a week with the next piece of the system.",
	brandEmail: "hello@buzzyfly.com",
	orderEmail: "coachmanager@gmail.com",
	guarantee: "30-day money-back guarantee — email us if it doesn't deliver.",
	emailSignature: "Buzzyfly",
	mailingAddress: "",
};

export const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00";

export const AUTOMATIC_DELIVERY_ENABLED = true;

export function getOrderAction(productIdOrTitle: string = BUZZYFLY_CONFIG.defaultProductTitle) {
	const product = getProduct(productIdOrTitle) ?? getProduct("buzzyfly-digital-system")!;
	return {
		live: true,
		href: product.buyUrl,
		label: "Buy now",
		external: product.buyUrl.startsWith("http"),
	};
}

export function getProduct(idOrTitle: string) {
	const key = idOrTitle.trim().toLowerCase();
	return ALL_PRODUCTS.find((p) => p.id === key || p.title.toLowerCase() === key) ?? null;
}

export function bundleSeparatePrice(): string {
	const parts = ["weekly-reset-checklist", "follow-up-email-templates", "client-onboarding-kit", "buzzyfly-digital-system"];
	const total = parts.reduce((sum, id) => sum + Number(getProduct(id)!.price.replace(/[^0-9.]/g, "")), 0);
	return `$${total}`;
}

export const PRODUCT_FILE_MAP: Record<
	string,
	{ r2Key: string; fileName: string; contentType: string }
> = {
	"buzzyfly-digital-system": {
		r2Key: "products/buzzyfly-digital-system.zip",
		fileName: "buzzyfly-digital-system.zip",
		contentType: "application/zip",
	},
	"weekly-reset-checklist": {
		r2Key: "products/weekly-reset-checklist.zip",
		fileName: "weekly-reset-checklist.zip",
		contentType: "application/zip",
	},
	"follow-up-email-templates": {
		r2Key: "products/follow-up-email-templates.zip",
		fileName: "follow-up-email-templates.zip",
		contentType: "application/zip",
	},
	"client-onboarding-kit": {
		r2Key: "products/client-onboarding-kit.zip",
		fileName: "client-onboarding-kit.zip",
		contentType: "application/zip",
	},
	"complete-business-bundle": {
		r2Key: "products/complete-business-bundle.zip",
		fileName: "complete-business-bundle.zip",
		contentType: "application/zip",
	},
};

export const UPSELL_MAP: Record<string, string | null> = {
	"weekly-reset-checklist": "client-onboarding-kit",
	"follow-up-email-templates": "buzzyfly-digital-system",
	"client-onboarding-kit": "buzzyfly-digital-system",
	"buzzyfly-digital-system": "complete-business-bundle",
	"complete-business-bundle": null,
};

export const ALL_PRODUCTS = [
	{
		id: "weekly-reset-checklist",
		title: "Weekly Reset Checklist",
		price: "$15",
		description: "Stop losing Monday to figuring out what to work on. Run one 20-minute routine and the week has a plan by 9:30.",
		features: ["20-minute weekly reset checklist", "Priority-setting template", "Thursday mid-week check-in", "Inbox-clearing routine"],
		buyUrl: "https://buy.stripe.com/5kQ7sNdxub3o0sk1lcaVa05",
		badge: null,
	},
	{
		id: "follow-up-email-templates",
		title: "Follow-Up Email Templates",
		price: "$19",
		description: "Stop letting quiet leads go cold. Five ready-to-send emails for every stage. Fill in a name and hit send.",
		features: ["Proposal follow-up (5–7 days)", "Mid-project check-in", "Re-engagement for quiet leads", "Referral request", "End-of-project wrap-up"],
		buyUrl: "https://buy.stripe.com/fZubJ3eByc7s1wo0h8aVa06",
		badge: null,
	},
	{
		id: "client-onboarding-kit",
		title: "Client Onboarding Kit",
		price: "$29",
		description: "A new client signs and you are ready in 20 minutes, not two hours. Welcome email, intake form and kickoff agenda already written.",
		features: ["Welcome email template with fill-in variables", "Intake form questions", "Kickoff meeting agenda", "Internal client notes format", "48-hour follow-up reminder format"],
		buyUrl: "https://buy.stripe.com/3cI8wR50Y8Vg3EwaVMaVa07",
		badge: null,
	},
	{
		id: "buzzyfly-digital-system",
		title: "Buzzyfly Digital System",
		price: "$49",
		description: "Onboarding, weekly planning and follow-ups as checklists you run in 20 minutes. The process still works on the weeks you are slammed.",
		features: ["Complete onboarding workflow", "20-minute weekly reset", "Follow-up system with templates", "Lifetime access + future updates"],
		buyUrl: "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00",
		badge: "Most popular",
	},
	{
		id: "complete-business-bundle",
		title: "Complete Business Bundle",
		price: "$97",
		description: "Every Buzzyfly checklist, template and script in one download. Never wonder which piece you are missing.",
		features: ["Everything in the Digital System", "Client Onboarding Kit", "Follow-Up Email Templates", "Weekly Reset Checklist", "All future product updates"],
		buyUrl: "https://buy.stripe.com/bJeeVf3WU1sOgri5BsaVa08",
		badge: "Best value",
	},
];
