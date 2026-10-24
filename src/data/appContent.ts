/**
 * Content for the Digital System web app at /app: pipeline stages, follow-up
 * timing, email templates, the onboarding plan and the Monday reset.
 *
 * Templates use {placeholders} filled from the client record and settings:
 * {first} {name} {project} {amount} {date} {start} {me}
 */

export type StageId = "lead" | "proposal" | "active" | "invoiced" | "done" | "lost";

export interface Stage {
	id: StageId;
	label: string;
	/** What the stage date means for this stage. */
	dateLabel: string;
}

export const STAGES: Stage[] = [
	{ id: "lead", label: "Lead", dateLabel: "First conversation" },
	{ id: "proposal", label: "Proposal sent", dateLabel: "Proposal sent on" },
	{ id: "active", label: "Active client", dateLabel: "Start date" },
	{ id: "invoiced", label: "Invoice sent", dateLabel: "Invoice due on" },
	{ id: "done", label: "Finished", dateLabel: "Finished on" },
	{ id: "lost", label: "Not going ahead", dateLabel: "Closed on" },
];

/** Follow-ups by stage: send `template` once `day` days have passed since the stage date. */
export const FOLLOW_UPS: Record<StageId, { day: number; template: string; label: string }[]> = {
	lead: [
		{ day: 1, template: "lead-recap", label: "Recap the conversation" },
		{ day: 6, template: "lead-nudge", label: "Second nudge" },
	],
	proposal: [
		{ day: 3, template: "proposal-1", label: "First proposal follow-up" },
		{ day: 7, template: "proposal-2", label: "Second proposal follow-up" },
		{ day: 14, template: "proposal-3", label: "Close the loop" },
	],
	active: [],
	invoiced: [
		{ day: 1, template: "invoice-1", label: "Invoice is 1 day overdue" },
		{ day: 7, template: "invoice-2", label: "Invoice is a week overdue" },
		{ day: 14, template: "invoice-3", label: "Invoice is two weeks overdue" },
	],
	done: [{ day: 30, template: "done-checkin", label: "30-day check-in" }],
	lost: [],
};

/** The 10-step onboarding plan. `day` counts from the client's start date. */
export const ONBOARDING_STEPS: { id: string; day: number; label: string; template?: string }[] = [
	{ id: "welcome", day: 0, label: "Send the welcome email", template: "welcome" },
	{ id: "intake", day: 0, label: "Send the intake questions", template: "intake" },
	{ id: "deposit", day: 1, label: "Confirm the deposit is paid" },
	{ id: "book-kickoff", day: 1, label: "Book the kickoff call", template: "kickoff-invite" },
	{ id: "access", day: 2, label: "Get logins, files and access you need" },
	{ id: "kickoff", day: 3, label: "Hold the kickoff call" },
	{ id: "summary", day: 3, label: "Send the kickoff summary and timeline", template: "kickoff-summary" },
	{ id: "first-date", day: 5, label: "Confirm the first delivery date in writing" },
	{ id: "checkin", day: 7, label: "Send a mid-week check-in", template: "onboarding-checkin" },
	{ id: "first-delivery", day: 10, label: "Deliver the first piece and ask for feedback", template: "first-delivery" },
];

/**
 * The guided Monday reset. Minutes add up to 20. `standalone` replaces the
 * detail in the Weekly Reset app, which has no Today list or client records.
 */
export const RESET_STEPS: { id: string; minutes: number; label: string; detail: string; standalone?: string }[] = [
	{ id: "money", minutes: 3, label: "Check the money", detail: "Open invoices and anything due to be paid this week." },
	{ id: "follow-ups", minutes: 5, label: "Send this week's follow-ups", detail: "Work through the Today list until it's empty.", standalone: "Reply to or nudge everyone you owe a message. Do it now, before the week fills up." },
	{ id: "onboarding", minutes: 2, label: "Move each new client forward", detail: "Tick off or send any onboarding step that's due.", standalone: "Send each new client the next thing they're waiting on from you." },
	{ id: "tasks", minutes: 5, label: "List the week's tasks and score them", detail: "Use the priority scorer below. The top score is your #1." },
	{ id: "block", minutes: 3, label: "Block time for your #1", detail: "Put it in your calendar before anything else." },
	{ id: "drop", minutes: 2, label: "Drop or delay one thing", detail: "Pick the task that can wait and tell anyone affected." },
];

export interface Template {
	id: string;
	label: string;
	group: "Follow-ups" | "Onboarding" | "Proposals and pricing" | "Scope guard";
	subject: string;
	body: string;
}

export const TEMPLATES: Template[] = [
	{
		id: "lead-recap",
		label: "Recap after a first conversation",
		group: "Follow-ups",
		subject: "Following up on {project}",
		body: "Hi {first},\n\nThanks for the time on {date}. Here's what I heard:\n\n- What you want: {project}\n- What's in the way right now: [their main problem]\n- When you'd like it done: [their timeline]\n\nIf that's right, I'll send a short proposal with the scope and price. Does that work?\n\n{me}",
	},
	{
		id: "lead-nudge",
		label: "Second nudge to a lead",
		group: "Follow-ups",
		subject: "Still want help with {project}?",
		body: "Hi {first},\n\nQuick one. Do you still want help with {project}, or has it moved down the list?\n\nEither answer is fine. I just don't want to keep a spot open if the timing changed.\n\n{me}",
	},
	{
		id: "proposal-1",
		label: "Proposal follow-up, day 3",
		group: "Follow-ups",
		subject: "Re: proposal for {project}",
		body: "Hi {first},\n\nThe proposal for {project} is still the one I sent on {date}. One question: is [start date] still the date you had in mind, or did it move?\n\n{me}",
	},
	{
		id: "proposal-2",
		label: "Proposal follow-up, day 7",
		group: "Follow-ups",
		subject: "Re: proposal for {project}",
		body: "Hi {first},\n\nChecking in on the {project} proposal. If something in it doesn't fit, like the scope, the price or the timing, tell me which part and I'll adjust it.\n\nIf now isn't the right time, that's fine too.\n\n{me}",
	},
	{
		id: "proposal-3",
		label: "Close the loop, day 14",
		group: "Follow-ups",
		subject: "Closing the loop on {project}",
		body: "Hi {first},\n\nI haven't heard back on {project}, so I'll assume the timing isn't right and close this out on my side.\n\nIf it comes back up, reply to this email and we'll pick it up from there.\n\n{me}",
	},
	{
		id: "invoice-1",
		label: "Invoice reminder, 1 day overdue",
		group: "Follow-ups",
		subject: "Invoice for {project}: {amount} due {date}",
		body: "Hi {first},\n\nA quick reminder that the invoice for {project} ({amount}) was due on {date}. Could you let me know when it's scheduled to be paid?\n\nThanks,\n{me}",
	},
	{
		id: "invoice-2",
		label: "Invoice reminder, 1 week overdue",
		group: "Follow-ups",
		subject: "Following up: invoice for {project}",
		body: "Hi {first},\n\nThe {amount} invoice for {project} is now a week past its {date} due date. Is there anything holding it up on your side, like a missing PO number or a different billing contact?\n\nI'm happy to resend it to whoever handles payments.\n\n{me}",
	},
	{
		id: "invoice-3",
		label: "Invoice reminder, 2 weeks overdue",
		group: "Follow-ups",
		subject: "Overdue invoice for {project}",
		body: "Hi {first},\n\nThe {amount} invoice for {project} is two weeks overdue. I'll pause new work on the account until it's settled.\n\nCan you confirm a payment date by the end of this week?\n\n{me}",
	},
	{
		id: "done-checkin",
		label: "30-day check-in after the project",
		group: "Follow-ups",
		subject: "How's {project} holding up?",
		body: "Hi {first},\n\nIt's been about a month since we wrapped {project}. How is it working for you?\n\nIf anything needs a tweak, tell me. And if you know someone who needs similar help, I'd be glad to talk to them.\n\n{me}",
	},
	{
		id: "welcome",
		label: "Welcome a new client",
		group: "Onboarding",
		subject: "Welcome. Next steps for {project}",
		body: "Hi {first},\n\nI'm glad we're working together on {project}. Here's what happens next:\n\n1. I'll send a few intake questions today.\n2. We'll book a kickoff call this week.\n3. After the call, you'll get a written summary with dates.\n\nWe start on {start}. Reply here any time with questions.\n\n{me}",
	},
	{
		id: "intake",
		label: "Intake questions",
		group: "Onboarding",
		subject: "A few questions before we start {project}",
		body: "Hi {first},\n\nBefore our kickoff, could you answer these? Short answers are fine.\n\n1. What does a great result look like for {project}?\n2. Who else needs to see or approve the work?\n3. Is there a hard deadline I should know about?\n4. What have you tried before, and what didn't work?\n5. Which logins, files or brand assets will I need?\n\nThanks,\n{me}",
	},
	{
		id: "kickoff-invite",
		label: "Book the kickoff call",
		group: "Onboarding",
		subject: "Kickoff call for {project}",
		body: "Hi {first},\n\nLet's book a 30-minute kickoff for {project}. Do any of these work?\n\n- [option 1]\n- [option 2]\n- [option 3]\n\nWe'll confirm goals, the first delivery date and who approves what.\n\n{me}",
	},
	{
		id: "kickoff-summary",
		label: "Kickoff summary and timeline",
		group: "Onboarding",
		subject: "Summary: {project} kickoff",
		body: "Hi {first},\n\nThanks for the call. Here's what we agreed:\n\n- Goal: [goal]\n- In scope: [list]\n- Not in scope: [list]\n- First delivery: [date]\n- Approvals: [who]\n\nIf anything here is off, reply today and I'll fix it before we start.\n\n{me}",
	},
	{
		id: "onboarding-checkin",
		label: "Mid-week check-in",
		group: "Onboarding",
		subject: "Quick check-in on {project}",
		body: "Hi {first},\n\nQuick update on {project}: [what's done] is done, and [what's next] is next. We're on track for [date].\n\nIs there anything you need from me, or anything that's changed on your side?\n\n{me}",
	},
	{
		id: "first-delivery",
		label: "First delivery and feedback",
		group: "Onboarding",
		subject: "First delivery for {project}",
		body: "Hi {first},\n\nThe first piece of {project} is ready: [link].\n\nCould you send feedback by [date]? One list of changes in one reply helps me turn it around fastest.\n\n{me}",
	},
	{
		id: "proposal-cover",
		label: "Send a proposal",
		group: "Proposals and pricing",
		subject: "Proposal for {project}",
		body: "Hi {first},\n\nHere's the proposal for {project}.\n\n- What you get: [deliverables]\n- Timeline: [start] to [finish]\n- Price: {amount}, with 50% to start and 50% on delivery\n- Not included: [anything you're leaving out]\n\nIf it looks right, reply \"yes\" and I'll send the deposit invoice and book our kickoff.\n\n{me}",
	},
	{
		id: "discount-reply",
		label: "When a client asks for a discount",
		group: "Proposals and pricing",
		subject: "Re: price for {project}",
		body: "Hi {first},\n\nThanks for asking. The price for {project} is {amount} for the scope in the proposal.\n\nIf the budget is tighter, I can lower the price by taking something out of the scope. For example, [item] would come off. Want me to send that version?\n\n{me}",
	},
	{
		id: "retainer-offer",
		label: "Offer a monthly retainer",
		group: "Proposals and pricing",
		subject: "Ongoing help after {project}",
		body: "Hi {first},\n\nNow that {project} is wrapped, would ongoing help be useful? I offer a monthly retainer: [hours] hours a month for {amount}, booked in advance so you get priority.\n\nWant me to send the details?\n\n{me}",
	},
	{
		id: "scope-reply",
		label: "A request that's outside the scope",
		group: "Scope guard",
		subject: "Re: {project}",
		body: "Hi {first},\n\nHappy to help with that. It's outside what we agreed for {project}, so I'll quote it separately.\n\nIt would be [price] and add [time] to the timeline. Want me to go ahead, or keep it for later?\n\n{me}",
	},
	{
		id: "change-order",
		label: "Confirm a change in writing",
		group: "Scope guard",
		subject: "Change to {project}: please confirm",
		body: "Hi {first},\n\nTo confirm the change we discussed for {project}:\n\n- Added: [what's added]\n- Price: [extra price]\n- New delivery date: [date]\n\nReply \"approved\" and I'll start on it.\n\n{me}",
	},
	{
		id: "revision-limit",
		label: "Revisions are used up",
		group: "Scope guard",
		subject: "Re: {project} revisions",
		body: "Hi {first},\n\nThe proposal for {project} includes [number] rounds of changes, and we've used them. I can do this round at [price], or we can lock in the current version.\n\nWhich would you prefer?\n\n{me}",
	},
];
