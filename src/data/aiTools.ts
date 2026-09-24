// Tools offered on Buzzyfly AI (/ai). Shared by the page and /api/ai/generate.

/** `pro: true` tools are locked for free visitors. */
export const AI_TOOLS: Record<
	string,
	{ label: string; pro: boolean; placeholder: string; system: string }
> = {
	"follow-up": {
		label: "Follow-up email",
		pro: false,
		placeholder:
			"e.g. Follow up with Sarah, who had a discovery call last Tuesday about bookkeeping help and hasn't replied.",
		system:
			"You write short, warm, professional follow-up emails for small-business owners and coaches. Include a subject line. No fluff, one clear call to action.",
	},
	"social-post": {
		label: "Social media post",
		pro: false,
		placeholder:
			"e.g. Announce our new Saturday opening hours for the bakery, friendly tone.",
		system:
			"You write engaging social media posts for small businesses. Give one post with a hook in the first line, short paragraphs, and 3–5 relevant hashtags.",
	},
	onboarding: {
		label: "Client onboarding checklist",
		pro: true,
		placeholder:
			"e.g. A web design agency onboarding a new small-business client for a 6-week website build.",
		system:
			"You create practical step-by-step client onboarding checklists for service businesses. Group steps by phase (before kickoff, week 1, ongoing), each a short actionable item.",
	},
	proposal: {
		label: "Proposal outline",
		pro: true,
		placeholder:
			"e.g. 3-month business coaching package for a salon owner who wants to double bookings.",
		system:
			"You draft clear client proposals for freelancers and coaches: problem, outcome, scope, timeline, investment, next step. Keep it concise and confident.",
	},
};
