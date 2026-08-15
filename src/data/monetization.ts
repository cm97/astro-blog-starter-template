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
	// Where manual orders and product support go while card checkout is being set up.
	orderEmail: "coachmanager@gmail.com",
};

/**
 * The live Stripe checkout URL for the Buzzyfly Digital System.
 *
 * DELIBERATELY EMPTY until a real Stripe Payment Link exists.
 *
 * Do not put a guessed, example, or "looks right" URL here. A buy button
 * pointing at a link that was never created fails silently: no error, no
 * sale, and no signal that anything is wrong. While this is empty, every buy
 * button on the site automatically falls back to a real mailto order path
 * (see `getOrderAction` below), so the store still takes orders.
 *
 * To go live:
 *   1. Stripe Dashboard -> Payments -> Payment Links -> create a link for the
 *      Buzzyfly Digital System at $49.
 *   2. On that link, set metadata `item_id` = "buzzyfly-digital-system".
 *      This is REQUIRED. `/api/webhook` reads `metadata.item_id` to decide
 *      which file to deliver; without it a paid order cannot be fulfilled
 *      (see the comment in src/lib/fulfillment.ts).
 *   3. Paste the URL below. Every buy button on the site goes live on deploy.
 */
export const STRIPE_CHECKOUT_URL = "";

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
};
