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
};

// Maps a purchased item/variant identifier (Lemon Squeezy `variant_id`, or a
// Stripe `price_id` / `product_id`) to the private object key inside the
// `MY_PRODUCTS` R2 bucket that should be delivered on fulfillment, plus the
// filename presented to the customer in the `Content-Disposition` header.
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
