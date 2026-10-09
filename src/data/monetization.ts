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
	// Public-facing brand address for email sent from Admin > Send email.
	// Replies reach you once Cloudflare Email Routing forwards it to your inbox.
	brandEmail: "hello@buzzyfly.com",
	// Where product support and manual delivery go.
	orderEmail: "coachmanager@gmail.com",
	// Hard guarantee shown on store and callouts. Keep the wording identical everywhere.
	guarantee: "30-day money-back guarantee — email us if it doesn't deliver.",
	// How the subscriber email sequence is signed.
	emailSignature: "Buzzyfly",
	// Postal address for the footer of subscriber emails. US anti-spam law
	// (CAN-SPAM) requires one in marketing email; a PO box is fine. Usually set
	// from Admin > Settings (saved to D1, which takes precedence over this
	// default). While empty, the weekly emails are paused; the welcome email
	// still sends.
	mailingAddress: "",
};

/**
 * Live Stripe Payment Link for the Buzzyfly Digital System.
 *
 * Created against Stripe account acct_1TpuoeRxSLoSSvA0 (buzzyfly-ocreater),
 * LIVE mode, on 2026-08-15. This is a real link returned by the Stripe API,
 * not a constructed one.
 *
 *   product  prod_V4jJUqsrKoJu3m
 *   price    price_1U4ZqaRxSLoSSvA0SJOsFLuq   ($49.00 USD, one-time)
 *   link     plink_1U4ZscRxSLoSSvA0ZSVk4SMm
 *
 * The link carries metadata `item_id: "buzzyfly-digital-system"`. Stripe copies
 * payment-link metadata onto the Checkout Session, which is exactly what
 * `parseStripeOrder` reads to decide which file to deliver. Do not remove it.
 *
 * Set to "" to take the store off card payments and fall back to email orders.
 */
export const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00";

/**
 * Whether a paid order is delivered to the customer automatically.
 *
 * FALSE until all of these Worker secrets exist in production:
 *   STRIPE_WEBHOOK_SECRET   (from the Stripe webhook endpoint we_1U4ZrrRxSLoSSvA0hj8EoGmv)
 *   DOWNLOAD_TOKEN_SECRET   (any long random string)
 * plus the `EMAIL` send_email binding in wrangler.json (Cloudflare Email
 * Service, no API key) with buzzyfly.com onboarded in the dashboard.
 *
 * While this is false, payment still works and every order is caught by the
 * hourly "Buzzyfly order watch" task, but the file is sent by hand. The store
 * page says so plainly rather than promising instant delivery it can't do.
 *
 * Flip to true once a real test purchase has arrived by email end to end.
 */
export const AUTOMATIC_DELIVERY_ENABLED = true;

/**
 * Resolves the buy action for a product, by id or title (defaults to the
 * Digital System). Card payments go through the PayPal checkout at
 * /buy/<product id>, which falls back to a real email order while PayPal is not
 * configured, so the site never renders a dead button.
 */
export function getOrderAction(productIdOrTitle: string = BUZZYFLY_CONFIG.defaultProductTitle) {
	const product = getProduct(productIdOrTitle) ?? getProduct("buzzyfly-digital-system")!;
	return {
		live: true,
		href: product.buyUrl,
		label: "Buy now",
		external: false,
	};
}

/** Finds a product by id or (case-insensitive) title. */
export function getProduct(idOrTitle: string) {
	const key = idOrTitle.trim().toLowerCase();
	return ALL_PRODUCTS.find((p) => p.id === key || p.title.toLowerCase() === key) ?? null;
}

/**
 * Sum of the single products the bundle contains, shown crossed out next to the
 * bundle price. Computed from real prices so it can never drift into a made-up
 * "was" price.
 */
export function bundleSeparatePrice(): string {
	const parts = ["weekly-reset-checklist", "follow-up-email-templates", "client-onboarding-kit", "buzzyfly-digital-system"];
	const total = parts.reduce((sum, id) => sum + Number(getProduct(id)!.price.replace(/[^0-9.]/g, "")), 0);
	return `$${total}`;
}

// Maps a purchased item identifier (the Stripe Checkout Session's
// `metadata.item_id`, or a Lemon Squeezy `variant_id`) to the private object
// key inside the `MY_PRODUCTS` R2 bucket (`buzzyfly-products`) that should be
// delivered on fulfillment, plus the filename presented to the customer in the
// `Content-Disposition` header.
//
// Extend this map with every sellable Buzzyfly digital product.
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

// Maps each product to the next logical upsell product id (null = top of funnel, they own everything).
export const UPSELL_MAP: Record<string, string | null> = {
	"weekly-reset-checklist": "client-onboarding-kit",
	"follow-up-email-templates": "buzzyfly-digital-system",
	"client-onboarding-kit": "buzzyfly-digital-system",
	"buzzyfly-digital-system": "complete-business-bundle",
	"complete-business-bundle": null,
};

// Why the UPSELL_MAP product is the right next buy, written to someone who
// already owns the key product. Used in the delivery and follow-up emails.
// Only claim what the product actually contains.
export const UPSELL_REASON: Record<string, string> = {
	"weekly-reset-checklist":
		"Your week has a plan now. The next place time leaks is new clients. The Client Onboarding Kit has the welcome email, intake form and kickoff agenda already written. A new client takes 20 minutes, not two hours.",
	"follow-up-email-templates":
		"You have the words. The Digital System adds the follow-up checklist that tells you when to send them, plus the onboarding checklist and the 20-minute weekly reset. That's what keeps the emails going out on a slammed week.",
	"client-onboarding-kit":
		"New clients are covered. The Digital System adds the weekly reset and the follow-up checklist. The client you just onboarded doesn't go quiet in week three, and neither does your pipeline.",
	"buzzyfly-digital-system":
		"The Complete Business Bundle is the Digital System plus the three single kits: the Client Onboarding Kit, the five Follow-Up Email Templates and the Weekly Reset Checklist. You already own the system. If you only want one kit, each is sold on its own at buzzyfly.com/store.",
};

export const ALL_PRODUCTS = [
	{
		id: "weekly-reset-checklist",
		title: "Weekly Reset Checklist",
		price: "$15",
		description: "Stop losing Monday to figuring out what to work on. Run one 20-minute routine and the week has a plan by 9:30.",
		features: ["20-minute weekly reset checklist", "Priority-setting template", "Thursday mid-week check-in", "Inbox-clearing routine"],
		buyUrl: "/buy/weekly-reset-checklist",
		badge: null,
	},
	{
		id: "follow-up-email-templates",
		title: "Follow-Up Email Templates",
		price: "$19",
		description: "Stop letting quiet leads go cold. Five ready-to-send emails for every stage. Fill in a name and hit send.",
		features: ["Proposal follow-up (5–7 days)", "Mid-project check-in", "Re-engagement for quiet leads", "Referral request", "End-of-project wrap-up"],
		buyUrl: "/buy/follow-up-email-templates",
		badge: null,
	},
	{
		id: "client-onboarding-kit",
		title: "Client Onboarding Kit",
		price: "$29",
		description: "A new client signs and you are ready in 20 minutes, not two hours. Welcome email, intake form and kickoff agenda already written.",
		features: ["Welcome email template with fill-in variables", "Intake form questions", "Kickoff meeting agenda", "Internal client notes format", "48-hour follow-up reminder format"],
		buyUrl: "/buy/client-onboarding-kit",
		badge: null,
	},
	{
		id: "buzzyfly-digital-system",
		title: "Buzzyfly Digital System",
		price: "$49",
		description: "Onboarding, weekly planning and follow-ups as checklists you run in 20 minutes. The process still works on the weeks you are slammed.",
		features: ["Complete onboarding workflow", "20-minute weekly reset", "Follow-up system with templates", "Lifetime access + future updates"],
		buyUrl: "/buy/buzzyfly-digital-system",
		badge: "Most popular",
	},
	{
		id: "complete-business-bundle",
		title: "Complete Business Bundle",
		price: "$97",
		description: "Every Buzzyfly checklist, template and script in one download. Never wonder which piece you are missing.",
		features: ["Everything in the Digital System", "Client Onboarding Kit", "Follow-Up Email Templates", "Weekly Reset Checklist", "All future product updates"],
		buyUrl: "/buy/complete-business-bundle",
		badge: "Best value",
	},
];

