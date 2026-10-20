
/** The page shown at /drop to anyone without an active Monthly Drop subscription. */
export function dropLockedPage(reason: "no-token" | "invalid" | "inactive"): Response {
	const heading = reason === "inactive" ? "Your Monthly Drop subscription has ended" : "The Monthly Drop is for subscribers";
	const body =
		reason === "inactive"
			? "Stripe shows this subscription as canceled or unpaid, so the app is locked. Your saved work is still here."
			: reason === "invalid"
				? "That unlock link isn't valid. Open the link from your Monthly Drop welcome email, or reply to that email for a new one."
				: "The Monthly Drop is not open to new subscribers.";
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Buzzyfly Monthly Drop</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{margin:0;background:#faf7ef;color:#23201a;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{max-width:560px;margin:0 auto;padding:48px 16px}h1{font-size:1.6rem;margin:0 0 8px}p{color:#6b6455}a.btn{display:inline-block;background:#e0a012;color:#1d1606;font-weight:600;padding:12px 18px;min-height:44px;border-radius:6px;text-decoration:none;margin-top:12px}a.btn:focus-visible,a:focus-visible{outline:3px solid #23201a;outline-offset:2px}small{display:block;margin-top:18px;color:#6b6455}small a{color:#23201a}</style></head>
<body><main><h1>${heading}</h1><p>${body}</p>
<a class="btn" href="/store">See the $49 Digital System</a>
<small>Already subscribed? Open the link in your welcome email. Lost it? Email <a href="mailto:support@buzzyfly.com">support@buzzyfly.com</a>.</small></main></body></html>`;
	return new Response(html, {
		status: reason === "invalid" ? 403 : 402,
		headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
	});
}
