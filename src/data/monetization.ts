// Centralized Buzzyfly monetization branding and configuration.
// Import from here anywhere a product callout, opt-in form, or fulfillment
// endpoint needs consistent Buzzyfly copy or defaults.

export const BUZZYFLY_CONFIG = {
	brandName: "Buzzyfly",
	siteUrl: "https://buzzyfly.com",
	defaultProductTitle: "Buzzyfly Digital System",
	defaultProductPrice: "$49",
	defaultProductDescription:
		"One Excel workbook that runs your client business. It shows who to follow up with today, writes the email, and walks every new client through onboarding.",
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

/** A product's buy link as a full URL, for emails and copy-paste text where a site-relative path will not work. */
export function absoluteBuyUrl(product: { buyUrl: string }) {
	return product.buyUrl.startsWith("http") ? product.buyUrl : `${BUZZYFLY_CONFIG.siteUrl}${product.buyUrl}`;
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
	"buzzyfly-monthly-drop": null,
};

export const ALL_PRODUCTS = [
	{
		id: "weekly-reset-checklist",
		title: "Weekly Reset Checklist",
		price: "$15",
		description: "Stop losing Monday to figuring out what to work on. An Excel planner walks you through a 20-minute reset, scores your tasks and picks your #1 priority.",
		features: ["Guided 20-minute Monday reset", "Priority scorer that picks your #1", "Thursday check-in and Friday close", "52-week log with a revenue chart"],
		buyUrl: "https://buy.stripe.com/5kQ7sNdxub3o0sk1lcaVa05",
		badge: null,
	},
	{
		id: "follow-up-email-templates",
		title: "Follow-Up Email Templates",
		price: "$19",
		description: "Stop letting quiet leads go cold. An Excel tracker that shows who to follow up with today and writes the email for you.",
		features: ["Follow-up dates worked out for you", "20 emails that fill in each person's details", "Today dashboard: who is due right now", "Add your own email templates"],
		buyUrl: "https://buy.stripe.com/fZubJ3eByc7s1wo0h8aVa06",
		badge: null,
	},
	{
		id: "client-onboarding-kit",
		title: "Client Onboarding Kit",
		price: "$29",
		description: "A new client signs and the Excel workbook lays out their first ten days. It shows what's due and writes each email for you.",
		features: ["10-step onboarding plan for every client", "Welcome, intake, kickoff and summary emails, pre-filled", "Intake form builder", "Client notes and progress tracking"],
		buyUrl: "https://buy.stripe.com/3cI8wR50Y8Vg3EwaVMaVa07",
		badge: null,
	},
	{
		id: "buzzyfly-digital-system",
		title: "Buzzyfly Digital System",
		price: "$49",
		description: "One Excel workbook for your client business. It shows who to follow up with today, writes the email, onboards new clients and runs your Monday reset.",
		features: ["Today dashboard: who needs you and what to send", "Follow-ups, onboarding and weekly reset in one workbook", "Proposal builder, pricing calculator, scope-creep replies", "Works in Excel and Google Sheets. No macros."],
		buyUrl: "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00",
		badge: "Most popular",
	},
	{
		id: "complete-business-bundle",
		title: "Complete Business Bundle",
		price: "$97",
		description: "Every Buzzyfly workbook in one download. Client OS plus the stand-alone Follow-Up, Onboarding and Weekly Reset workbooks.",
		features: ["Buzzyfly Client OS (the Digital System workbook)", "Client Onboarding workbook", "Follow-Up Tracker workbook", "Weekly Reset Planner workbook"],
		buyUrl: "https://buy.stripe.com/bJeeVf3WU1sOgri5BsaVa08",
		badge: "Best value",
	},
	{
		id: "buzzyfly-monthly-drop",
		title: "Buzzyfly Monthly Drop",
		price: "$19/month",
		description: "New real content every month: fresh email template pack, updated weekly reset checklist, new client onboarding asset, and one digital system update. Delivered to your inbox. Cancel anytime.",
		features: ["New email templates every month", "Updated weekly reset checklist", "New client onboarding asset", "Digital system update", "Cancel anytime"],
		buyUrl: "https://buy.stripe.com/eVq4gB7963AWfned3UaVa09",
		badge: "Monthly",
	},
];
