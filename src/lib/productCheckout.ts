import { ALL_PRODUCTS, PRODUCT_FILE_MAP, UPSELL_MAP } from "../data/monetization";

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

/**
 * Upgrade offer for someone who just bought `fromId`: the next product in UPSELL_MAP for
 * the price difference, so they never pay twice for what they already own.
 */
export function findUpgrade(fromId: string) {
	const from = findSellableProduct(fromId);
	const toId = UPSELL_MAP[fromId];
	const to = toId ? findSellableProduct(toId) : null;
	if (!from || !to) return null;
	const amount = Number(to.amount) - Number(from.amount);
	if (!(amount > 0)) return null;
	return { from, to, amount: amount.toFixed(2) };
}

const UPGRADE_PREFIX = "upgrade:";

/** PayPal custom_id for an upgrade order. Only our server creates orders, so it can't be forged. */
export function upgradeCustomId(fromId: string, toId: string): string {
	return `${UPGRADE_PREFIX}${fromId}:${toId}`;
}

/**
 * What a captured PayPal order's custom_id paid for: the product to deliver and the minimum
 * amount that counts as paid in full (the full price, or the difference for an upgrade).
 */
export function resolveCheckoutItem(customId: string) {
	if (customId.startsWith(UPGRADE_PREFIX)) {
		const [fromId, toId] = customId.slice(UPGRADE_PREFIX.length).split(":");
		const upgrade = fromId ? findUpgrade(fromId) : null;
		if (!upgrade || upgrade.to.id !== toId) return null;
		return { product: upgrade.to, requiredAmount: upgrade.amount };
	}
	const product = findSellableProduct(customId);
	return product ? { product, requiredAmount: product.amount } : null;
}
