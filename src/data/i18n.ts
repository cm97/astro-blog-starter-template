// Language versions of pages, for hreflang tags and language links.
// Prices stay in US dollars and the refund rule keeps the same meaning in every language.
import { BUZZYFLY_CONFIG } from "./monetization";

const site = BUZZYFLY_CONFIG.siteUrl;

export const STORE_ALTERNATES = [
	{ hreflang: "en", href: `${site}/store/` },
	{ hreflang: "es", href: `${site}/es/store/` },
	{ hreflang: "x-default", href: `${site}/store/` },
];

export const HOME_ALTERNATES = [
	{ hreflang: "en", href: `${site}/` },
	{ hreflang: "es", href: `${site}/es/` },
	{ hreflang: "x-default", href: `${site}/` },
];

/** Spanish short refund rule. Same meaning as BUZZYFLY_CONFIG.guaranteeShort. */
export const GUARANTEE_SHORT_ES = "Reembolso en 30 días si no puedes acceder a la app o no es lo que se describe.";

/** Spanish refund rule. Same meaning as BUZZYFLY_CONFIG.guarantee. */
export const GUARANTEE_ES =
	"Reembolso en un plazo de 30 días si no puedes entrar en la app o no es lo que describía la ficha del producto. No hay reembolsos por cambio de opinión una vez que has tenido acceso.";
