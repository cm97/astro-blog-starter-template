// Centralized Buzzyfly monetization branding and configuration.
// Import from here anywhere a product callout, opt-in form, or fulfillment
// endpoint needs consistent Buzzyfly copy or defaults.

export const BUZZYFLY_CONFIG = {
	brandName: "Buzzyfly",
	siteUrl: "https://buzzyfly.com",
	defaultProductTitle: "Buzzyfly Digital System",
	defaultProductPrice: "$49",
	defaultProductDescription:
		"Browser web app for your client business. Open it and see who to follow up with today, the email to send, onboarding steps for new clients, and your Monday reset — no download, no Excel.",
	newsletterTitle: "Send me the 20-minute weekly reset checklist",
	newsletterDescription:
		"Free. No spam. Just the checklist, plus one email a week with the next piece of the system.",
	brandEmail: "hello@buzzyfly.com",
	/** Public contact on pages and in emails. */
	supportEmail: "support@buzzyfly.com",
	/** Owner inbox for internal order alerts only. Never shown on public pages. */
	orderEmail: "coachmanager@gmail.com",
	guarantee: "30-day refund if the app wasn't accessible or isn't what the listing described. No change-of-mind refunds after access is granted.",
	guaranteeShort: "30-day refund for non-access or app not as described.",
	emailSignature: "Buzzyfly",
	mailingAddress: "",
};

export const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00";

export const AUTOMATIC_DELIVERY_ENABLED = true;

/** A product's buy button. Products with no buyUrl are not for sale yet and get no link. */
export function getOrderAction(productIdOrTitle: string = BUZZYFLY_CONFIG.defaultProductTitle) {
	const product = getProduct(productIdOrTitle) ?? getProduct("buzzyfly-digital-system")!;
	if (!product.buyUrl) return { live: false as const, href: null, label: "Coming soon", external: false };
	return {
		live: true as const,
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
export function absoluteBuyUrl(product: { buyUrl: string | null }) {
	if (!product.buyUrl) return `${BUZZYFLY_CONFIG.siteUrl}/store`;
	return product.buyUrl.startsWith("http") ? product.buyUrl : `${BUZZYFLY_CONFIG.siteUrl}${product.buyUrl}`;
}

export function bundleSeparatePrice(): string {
	const parts = ["weekly-reset-checklist", "follow-up-email-templates", "client-onboarding-kit", "buzzyfly-digital-system"];
	const total = parts.reduce((sum, id) => sum + Number(getProduct(id)!.price.replace(/[^0-9.]/g, "")), 0);
	return `$${total}`;
}

export interface Product {
	id: string;
	title: string;
	price: string;
	description: string;
	features: string[];
	/** Checkout link. null means "Coming soon", no buy button anywhere. */
	buyUrl: string | null;
	badge: string | null;
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

// Only the Digital System is for sale, so it is the only upsell target.
export const UPSELL_MAP: Record<string, string | null> = {
	"weekly-reset-checklist": "buzzyfly-digital-system",
	"follow-up-email-templates": "buzzyfly-digital-system",
	"client-onboarding-kit": "buzzyfly-digital-system",
	"buzzyfly-digital-system": null,
	"complete-business-bundle": null,
};

// Only the $49 Digital System is buyable. The rest stay "Coming soon" with buyUrl: null.
export const ALL_PRODUCTS: Product[] = [
	{
		id: "weekly-reset-checklist",
		title: "Weekly Reset Checklist",
		price: "$15",
		description: "Stop losing Monday to figuring out what to work on. An Excel planner walks you through a 20-minute reset, scores your tasks and picks your #1 priority.",
		features: ["Guided 20-minute Monday reset", "Priority scorer that picks your #1", "Thursday check-in and Friday close", "52-week log with a revenue chart"],
		buyUrl: null,
		badge: "Coming soon",
	},
	{
		id: "follow-up-email-templates",
		title: "Follow-Up Email Templates",
		price: "$19",
		description: "Stop letting quiet leads go cold. An Excel tracker that shows who to follow up with today and writes the email for you.",
		features: ["Follow-up dates worked out for you", "20 emails that fill in each person's details", "Today dashboard: who is due right now", "Add your own email templates"],
		buyUrl: null,
		badge: "Coming soon",
	},
	{
		id: "client-onboarding-kit",
		title: "Client Onboarding Kit",
		price: "$29",
		description: "A new client signs and the Excel workbook lays out their first ten days. It shows what's due and writes each email for you.",
		features: ["10-step onboarding plan for every client", "Welcome, intake, kickoff and summary emails, pre-filled", "Intake form builder", "Client notes and progress tracking"],
		buyUrl: null,
		badge: "Coming soon",
	},
	{
		id: "buzzyfly-digital-system",
		title: "Buzzyfly Digital System",
		price: "$49",
		description: "Browser web app. Open it and see who to follow up with today, the email to send, onboarding for new clients, and your Monday reset. No download. No Excel.",
		features: ["Today dashboard: who needs you and what to send", "Follow-ups, onboarding and weekly reset in the browser", "Proposal and scope replies ready to copy", "Works on phone. No files."],
		buyUrl: "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00",
		badge: "Most popular",
	},
	{
		id: "complete-business-bundle",
		title: "Complete Business Bundle",
		price: "$97",
		description: "Every Buzzyfly workbook in one download. Client OS plus the stand-alone Follow-Up, Onboarding and Weekly Reset workbooks.",
		features: ["Buzzyfly Client OS (the Digital System workbook)", "Client Onboarding workbook", "Follow-Up Tracker workbook", "Weekly Reset Planner workbook"],
		buyUrl: null,
		badge: "Coming soon",
	},
];
