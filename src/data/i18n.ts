// Language versions of pages, for hreflang tags and language links.
// Prices stay in US dollars and the refund rule keeps the same meaning in every language.
import { BUZZYFLY_CONFIG } from "./monetization";

const site = BUZZYFLY_CONFIG.siteUrl;

export const STORE_ALTERNATES = [
	{ hreflang: "en", href: `${site}/store/` },
	{ hreflang: "es", href: `${site}/es/store/` },
	{ hreflang: "x-default", href: `${site}/store/` },
];

/** Spanish refund rule. Same meaning as BUZZYFLY_CONFIG.guarantee. */
export const GUARANTEE_ES =
	"Reembolso en un plazo de 30 días si no puedes entrar en la app o no es lo que describía la ficha del producto. No hay reembolsos por cambio de opinión una vez que has tenido acceso.";
