import { ALL_PRODUCTS } from "../data/monetization";
import { isAppItem } from "./appAccess";

export const PRODUCT_CURRENCY = "USD";

/**
 * A web-app product that can be bought through PayPal: it's on sale (has a
 * Stripe Payment Link), has a price, and unlocks an app rather than a file.
 */
export function findSellableProduct(id: string) {
	const product = ALL_PRODUCTS.find((p) => p.id === id);
	if (!product || !product.buyUrl || !isAppItem(id)) return null;
	const amount = Number(product.price.replace(/[^0-9.]/g, ""));
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return { id, title: product.title, amount: amount.toFixed(2), buyUrl: product.buyUrl };
}

/** Where a product's "Pay with PayPal" button points. */
export function paypalBuyUrl(id: string): string {
	return `/buy/${id}`;
}
