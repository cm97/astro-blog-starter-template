import { ALL_PRODUCTS } from "../data/monetization";
import { isAppItem } from "./appAccess";

export const PRODUCT_CURRENCY = "USD";

/** A web app that can be bought through PayPal: it is on sale (has a buyUrl) and unlocks with an app key. */
export function findSellableProduct(id: string) {
	const product = ALL_PRODUCTS.find((p) => p.id === id);
	if (!product || !product.buyUrl || !isAppItem(id)) return null;
	const amount = Number(product.price.replace(/[^0-9.]/g, ""));
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return { id, title: product.title, amount: amount.toFixed(2) };
}

/** Where every buy button for a product points. */
export function productBuyUrl(id: string): string {
	return `/buy/${id}`;
}
