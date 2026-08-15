// Default landing-page copy, and the schema the admin content editor renders.
//
// This array is the single source of truth: the landing page reads values
// through it, and /admin/content builds its form from it. Adding a new editable
// field is one entry here — no separate form markup to keep in sync.
//
// Every field has a default, so the site renders correctly against a completely
// empty `site_content` table. Saved values override; blank values fall back.

export interface SiteContentField {
	key: string;
	/** Label shown above the input in the admin editor. */
	label: string;
	/** Short explanation shown under the input. */
	hint?: string;
	/** Renders a textarea instead of a single-line input. */
	multiline?: boolean;
	default: string;
}

export const SITE_CONTENT_FIELDS: SiteContentField[] = [
	{
		key: "brand_name",
		label: "Brand name",
		hint: "Shown large at the top of the landing page.",
		default: "Buzzyfly",
	},
	{
		key: "hero_headline",
		label: "Headline",
		hint: "The one-line promise directly under your brand name.",
		default: "Small ideas, long distances.",
	},
	{
		key: "hero_subheadline",
		label: "Sub-headline",
		hint: "A sentence or two on what you make and who it is for.",
		multiline: true,
		default:
			"Practical systems, reusable templates, and honest write-ups on getting things done — sent straight from the Buzzyfly notebook.",
	},
	{
		key: "hero_cta_label",
		label: "Button text",
		default: "See what I sell",
	},
	{
		key: "hero_cta_href",
		label: "Button link",
		hint: "Use #products to jump to the product list, or any URL.",
		default: "#products",
	},
	{
		key: "products_heading",
		label: "Product section heading",
		default: "What I sell",
	},
	{
		key: "products_intro",
		label: "Product section intro",
		multiline: true,
		default: "Digital tools you can download the moment you buy them.",
	},
	{
		key: "products_empty",
		label: "Empty-shop message",
		hint: "Shown in place of the product grid when nothing is published yet.",
		multiline: true,
		default:
			"The first products are being finished right now. Join the dispatch below and you'll hear the moment they land.",
	},
	{
		key: "newsletter_heading",
		label: "Newsletter heading",
		default: "Join the Buzzyfly Dispatch",
	},
	{
		key: "newsletter_body",
		label: "Newsletter blurb",
		multiline: true,
		default:
			"Get exclusive Buzzyfly digital tools, templates, and insights delivered to your inbox.",
	},
];

/** Defaults keyed for quick lookup and as the base layer for saved content. */
export const SITE_CONTENT_DEFAULTS: Record<string, string> = Object.fromEntries(
	SITE_CONTENT_FIELDS.map((field) => [field.key, field.default]),
);
