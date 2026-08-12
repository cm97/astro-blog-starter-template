// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = "Buzzyfly";
export const SITE_DESCRIPTION = "The official Buzzyfly site.";

// Social accounts shown in the header and footer.
//
// Empty by default so the site never links out to accounts Buzzyfly does not
// own. Add real Buzzyfly handles here and they appear in both places, e.g.:
//
//   { label: "Follow Buzzyfly on Twitter", href: "https://twitter.com/buzzyfly", icon: "twitter" }
//
// Supported `icon` values are defined in src/components/SocialLinks.astro.
export type SocialLink = {
	label: string;
	href: string;
	icon: "mastodon" | "twitter" | "github";
};

export const SOCIAL_LINKS: SocialLink[] = [];
