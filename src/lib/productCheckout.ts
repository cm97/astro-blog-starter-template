import { ALL_PRODUCTS, PRODUCT_FILE_MAP } from "../data/monetization";

export const PRODUCT_CURRENCY = "USD";

/** A digital product that can be bought through PayPal: it has a price and a file to deliver. */
export function findSellableProduct(id: string) {
	const product = ALL_PRODUCTS.find((p) => p.id === id);
	if (!product || !PRODUCT_FILE_MAP[id]) return null;
	const amount = Number(product.price.replace(/[^0-9.]/g, ""));
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return { id, title: product.title, amount: amount.toFixed(2) };
}

/** Where every buy button for a product points. */
export function productBuyUrl(id: string): string {
	return `/buy/${id}`;
}
