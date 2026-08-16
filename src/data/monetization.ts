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

// LEGACY — do not add new products here.
//
// Products now live in the D1 `products` table and are managed at /admin, which
// means adding one no longer needs a code change or a deploy. See SHOP.md.
//
// This map is retained only as the last fallback inside `resolveDeliverable`
// (src/lib/fulfillment.ts), so that any checkout link created before the
// catalog existed still delivers a file instead of failing silently on a
// customer who has already paid. It can be deleted once no live checkout link
// references these keys.
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
