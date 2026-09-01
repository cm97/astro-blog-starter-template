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
	newsletterTitle: "Send me the 20-minute weekly reset",
	newsletterDescription:
		"Get the free checklist that keeps your week from collapsing by Thursday. No spam, no course — just the reset, then the full system when you're ready.",
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
			label: "Get the Digital System — $49",
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
};
