export async function draftReply(
	apiKey: string,
	input: { kind: "domain" | "order"; email: string; detail: string; price?: string },
): Promise<{ subject: string; body: string }> {
	const facts =
		input.kind === "domain"
			? `They asked about the domain ${input.detail}. We have not registered it and this email must not say that we did. The only card payment available is the Buzzyfly Digital System for $49 at https://buy.stripe.com/bJebJ3dxudbwejaaVMaVa00 . Mention it as a separate product, not as the domain purchase.`
			: `They asked to buy "${input.detail}" for ${input.price ?? "the listed price"}. Nothing has been charged. Ask them to reply so you can send payment details. Do not invent a card link.`;

	const response = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
		body: JSON.stringify({
			model: "grok-4.5",
			temperature: 0.4,
			max_tokens: 400,
			messages: [
				{
					role: "system",
					content:
						'You write short plain-text emails for Buzzyfly. Reply with JSON only: {"subject":"...","body":"..."}. Body under 120 words. No markdown. Sign off as Buzzyfly.',
				},
				{
					role: "user",
					content: `Write to ${input.email}. ${facts}`,
				},
			],
		}),
	});
	if (!response.ok) throw new Error(`Grok replied ${response.status}`);
	const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
	const text = payload.choices?.[0]?.message?.content ?? "";
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start < 0 || end <= start) throw new Error("Grok did not return a draft");
	const parsed = JSON.parse(text.slice(start, end + 1)) as { subject?: string; body?: string };
	const subject = String(parsed.subject ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
	const body = String(parsed.body ?? "").trim().slice(0, 1500);
	if (!subject || !body) throw new Error("Draft was empty");
	return { subject, body };
}
