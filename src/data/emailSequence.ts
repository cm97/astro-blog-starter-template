// Weekly email sequence for free-checklist subscribers.
//
// Email 0 is sent at signup (see /api/subscribe). The hourly cron in
// src/worker-entry.ts sends the rest, one every 7 days, via
// src/lib/emailSequence.ts.
//
// Body format, kept deliberately small:
//   - blank line          -> new paragraph
//   - "- item"            -> bullet list
//   - "1. item"           -> numbered list
//   - "> text"            -> quoted text (for copy-paste templates)
//   - {checklist} {store} {orderEmail} -> replaced with real values
//   - bare https:// URLs  -> links
// The signature and unsubscribe footer are added automatically.

export interface SequenceEmail {
	subject: string;
	preview: string;
	body: string;
}

export const SEQUENCE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export const EMAIL_SEQUENCE: SequenceEmail[] = [
	{
		subject: "Your 20-minute weekly reset",
		preview: "One thing to do before you open it.",
		body: `Hi,

Here's your checklist: {checklist}

Before you read it, do one thing: put 20 minutes in your calendar for next Monday morning and call it "Weekly reset." Same time every week.

That calendar block matters more than the checklist. Most planning systems fail because they never get a fixed slot, not because the system is bad.

Next week I'll send the part that stops the reset from falling apart by Thursday.

P.S. What's the one thing that derails your week most often? Tell me at {orderEmail}. I read every one.`,
	},
	{
		subject: "Did Thursday happen?",
		preview: "The 5-minute check that saves the week.",
		body: `Hi,

If you ran your reset on Monday, here's the usual pattern: Monday feels great, Tuesday's fine, and by Thursday the plan is gone.

The fix is a 5-minute Wednesday check. Ask one question:

> "Are my three priorities still the three?"

If yes, keep going. If something changed, swap one priority. Only one. Then leave it alone until Friday.

Three phrases that keep it short:

- "Still the priority, or does this move?"
- "One clear next step: [date] or off the list."
- "This week's three: 1) 2) 3). Everything else waits."

Friday, take 10 minutes: what got done, what rolls to Monday, what dies.

That's the whole weekly rhythm. Monday 20 minutes, Wednesday 5, Friday 10.`,
	},
	{
		subject: "The follow-up email people actually answer",
		preview: "It's the one where you give up.",
		body: `Hi,

Sent a proposal and heard nothing? Most people either nag or go quiet forever. There's a better middle.

About 3 days after your first check-in, send the bump:

> "Hi [Name], wanted to make sure the [project] proposal didn't get buried. Still want to move forward, or should I take it off my list?"

If that gets silence too, around day 14 send the break-up:

> "Hi [Name], I'm going to assume [project] isn't the right time and close the file on my side. If that's wrong, reply this week and I'll reopen it. No hard feelings."

The break-up email is the one people reply to. It gives them a real deadline and makes "no" easy to say. Either way, you stop carrying a dead lead in your head.

This week's homework: find one proposal that's gone quiet, and send the right email for where it's at.`,
	},
	{
		subject: "“Can you just…”",
		preview: "The sentence that stops free work.",
		body: `Hi,

Scope creep usually doesn't come from difficult clients. It comes from us saying "sure, no problem" because the ask is small and no feels awkward.

Here's the line to use instead:

> "I can do that. It's outside what we agreed on, so it's a separate line item: [price]. Want me to add it, or keep it for after this project wraps?"

Three rules:

1. Never say yes in the moment. "Let me check and get back to you in an hour."
2. Always name a price, even $25.
3. Always give them the out: "No worries, we stick to the original scope."

This script, plus five more for the harder moments (pushback, endless revisions, "I thought that was included"), is part of the Buzzyfly Digital System. It's the full set: onboarding, weekly reset, follow-ups, scope scripts, proposals and retention. Checklists you run, not a course you watch.

$49 once, with a 30-day money-back guarantee: {store}

If not, no problem. Next week's email is still free.`,
	},
	{
		subject: "The 48 hours after a client pays",
		preview: "When they decide whether to trust you.",
		body: `Hi,

Clients decide whether they made the right call in the first 48 hours after paying. Most of us put all our effort into the sale and then wing that part.

A simple first week. Within 1 hour of signing:

- Welcome email: what happens next, and when
- Intake form, 5 questions max
- Kickoff call booked

Kickoff: 25 minutes, not an hour. Confirm the goal in their words, and confirm what's NOT included.

Week one, four touches:

- Day 2: confirm you have everything from intake
- Day 4: first milestone, or a one-line status update
- Day 6: "On track, blocked, or anything changed?"
- Day 7: add them to your follow-up list so week two isn't silence

If a touch is late, send it late. Don't skip it because you're embarrassed.`,
	},
	{
		subject: "$500 or $1,200?",
		preview: "Stop pricing from anxiety.",
		body: `Hi,

If quoting a price makes you feel sick, you're guessing. Here's the math instead.

1. Floor rate = your annual goal ÷ 50 weeks ÷ the hours you actually bill each week. $80,000 ÷ 50 ÷ 35 = $45.71 an hour. Never go below it.
2. Estimate the hours honestly, then add 20%. 10 hours becomes 12.
3. Rate × hours, rounded up. 12 × $45.71 = $548, so quote $550.
4. Value check: is that clearly less than what the result is worth to them? If yes, raise it.

Your floor isn't your price. It's the number you never go under.

Try it on the next thing you quote and see if the number surprises you.`,
	},
	{
		subject: "Stop rebuilding it from memory",
		preview: "Everything from the last six weeks, in one place.",
		body: `Hi,

Over the last six weeks I've sent you pieces of the system: the weekly reset, the Thursday check, follow-ups, scope creep, onboarding and pricing.

If any of it helped, the Buzzyfly Digital System is all of it in one download, ready to use:

- Client onboarding: checklist, intake form, kickoff agenda
- Weekly planning: the Monday, Wednesday and Friday reset
- Follow-ups: templates, timing, and the break-up email
- Scope and proposals: six scope scripts, a one-page proposal, a pricing worksheet
- Retention: checklist and re-engagement email

Who it's for: one- or few-person businesses where the process lives in your head.

Who it's not for: anyone who already has a documented system that works. You'd be buying what you already have.

$49 once. No subscription. 30-day money-back guarantee. If it doesn't help, email me and you get a full refund.

{store}

P.S. Got a question before buying? Email {orderEmail}. You're writing to the person who built it.`,
	},
];
