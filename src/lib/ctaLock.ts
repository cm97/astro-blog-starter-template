/**
 * Live $49 Payment Link lock — SoftAck OFF.
 * Never editable in Admin. Public CTAs must import this constant.
 * Do not invent a second checkout URL or wire PL into D1/settings.
 */
export const LIVE_49_PL = "https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00";

/** @deprecated Prefer LIVE_49_PL — kept so W1a imports keep working. */
export const HOME_CTA_HREF_LOCKED = LIVE_49_PL;
