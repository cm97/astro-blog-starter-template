// Centralized Buzzyfly monetization branding and configuration.
// Import from here anywhere a product callout, opt-in form, or fulfillment
// endpoint needs consistent Buzzyfly copy or defaults.

export const BUZZYFLY_CONFIG = {
	brandName: "Buzzyfly",
	siteUrl: "https://buzzyfly.com",
	defaultProductTitle: "Buzzyfly Digital System",
	defaultProductPrice: "$49",
	defaultProductDescription:
		"The complete Buzzyfly operating framework to streamline your workflow.",
	newsletterTitle: "Join the Buzzyfly Dispatch",
	newsletterDescription:
		"Get exclusive Buzzyfly digital tools, templates, and insights delivered to your inbox.",
	// Where product support and manual delivery go.
	orderEmail: "coachmanager@gmail.com",
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
 *   EMAIL_API_KEY           (e.g. a Resend API key)
 *   EMAIL_FROM              (e.g. Buzzyfly <orders@buzzyfly.com>)
 *
 * While this is false, payment still works and every order is caught by the
 * hourly "Buzzyfly order watch" task, but the file is sent by hand. The store
 * page says so plainly rather than promising instant delivery it can't do.
 *
 * Flip to true once a real test purchase has arrived by email end to end.
 */
export const AUTOMATIC_DELIVERY_ENABLED = false;

/**
 * Resolves the buy action for a product. Returns the live Stripe checkout when
 * one is configured, and a real, working email order path when it is not — so
 * the site never renders a dead checkout button.
 */
export function getOrderAction(productTitle: string = BUZZYFLY_CONFIG.defaultProductTitle) {
	if (STRIPE_CHECKOUT_URL) {
		return {
			live: true,
			href: STRIPE_CHECKOUT_URL,
			label: "Buy now",
			external: true,
		};
	}

	const subject = encodeURIComponent(`Order: ${productTitle}`);
	const body = encodeURIComponent(
		`Hi,\n\nI'd like to order the ${productTitle}.\n\nPlease send payment details and the download.\n\nThanks,\n`,
	);

	return {
		live: false,
		href: `mailto:${BUZZYFLY_CONFIG.orderEmail}?subject=${subject}&body=${body}`,
		label: "Email to order",
		external: false,
	};
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

export const ALL_PRODUCTS = [
	{
		id: "weekly-reset-checklist",
		title: "Weekly Reset Checklist",
		price: "$15",
		description: "The 20-minute Monday routine that keeps your week on track. Clear inboxes, set one priority, plan your week — same way every time.",
		features: ["20-minute weekly reset checklist", "Priority-setting template", "Thursday mid-week check-in", "Inbox-clearing routine"],
		stripeUrl: "https://buy.stripe.com/5kQ7sNdxub3o0sk1lcaVa05",
		badge: null,
	},
	{
		id: "follow-up-email-templates",
		title: "Follow-Up Email Templates",
		price: "$19",
		description: "5 ready-to-send follow-up emails. Fill in a name, hit send — no staring at a blank screen.",
		features: ["Proposal follow-up (5–7 days)", "Mid-project check-in", "Re-engagement for quiet leads", "Referral request", "End-of-project wrap-up"],
		stripeUrl: "https://buy.stripe.com/fZubJ3eByc7s1wo0h8aVa06",
		badge: null,
	},
	{
		id: "client-onboarding-kit",
		title: "Client Onboarding Kit",
		price: "$29",
		description: "Everything to onboard a new client in 20 minutes — welcome email, intake form, kickoff agenda, internal notes format.",
		features: ["Welcome email template with fill-in variables", "Intake form questions", "Kickoff meeting agenda", "Internal client notes format", "48-hour follow-up reminder format"],
		stripeUrl: "https://buy.stripe.com/3cI8wR50Y8Vg3EwaVMaVa07",
		badge: null,
	},
	{
		id: "buzzyfly-digital-system",
		title: "Buzzyfly Digital System",
		price: "$49",
		description: "The complete operating framework — onboarding, weekly planning, and follow-up workflows. The system that holds everything together.",
		features: ["Complete onboarding workflow", "20-minute weekly reset", "Follow-up system with templates", "Lifetime access + future updates"],
		stripeUrl: "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00",
		badge: "Most popular",
	},
	{
		id: "complete-business-bundle",
		title: "Complete Business Bundle",
		price: "$97",
		description: "Every Buzzyfly product in one download. The Digital System + Onboarding Kit + Follow-Up Templates + Weekly Checklist. Everything.",
		features: ["Everything in the Digital System", "Client Onboarding Kit", "Follow-Up Email Templates", "Weekly Reset Checklist", "All future product updates"],
		stripeUrl: "https://buy.stripe.com/bJeeVf3WU1sOgri5BsaVa08",
		badge: "Best value",
	},
];
