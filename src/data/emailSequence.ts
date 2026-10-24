// Weekly email sequence for free-checklist subscribers. It moves a subscriber
// toward the $49 Digital System:
//   1    deliver the free checklist, set expectations
//   2-3  teach one piece of the system, tease the full version
//   4-5  objection handling ("I'll build my own", "what if it doesn't work")
//   6-7  direct pitch, no deadline ("when you're ready")
// No invented testimonials, no fake scarcity, no income promises. When real
// customer replies exist (with permission), add one to email 4.
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
//   - {checklist} {store} {supportEmail} -> replaced with real values
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

Before you read it, do one thing. Put 20 minutes in your calendar for next Monday morning. Call it "Weekly reset." Same time every week.

That calendar block matters more than the checklist. Most planning systems fail because they never get a fixed slot. The system is rarely the problem.

What to expect from me: one short email a week. Each one is a piece of the system you can use that day. Next week is the part that stops the reset from falling apart by Thursday.

P.S. What's the one thing that derails your week most often? Tell me at {supportEmail}. I read every one.`,
	},
	{
		subject: "Did Thursday happen?",
		preview: "The 5-minute check that saves the week.",
		body: `Hi,

If you ran your reset on Monday, here's the usual pattern. Monday feels great. Tuesday's fine. By Thursday the plan is gone.

The fix is a 5-minute Wednesday check. Ask one question:

> "Are my three priorities still the three?"

If yes, keep going. If something changed, swap one priority. Only one. Then leave it alone until Friday.

Three phrases that keep it short:

- "Still the priority, or does this move?"
- "One clear next step: [date] or off the list."
- "This week's three: 1) 2) 3). Everything else waits."

Friday, take 10 minutes. What got done? What rolls to Monday? What dies?

That's the whole weekly rhythm. Monday 20 minutes, Wednesday 5, Friday 10.

The full version is the Weekly reset tab in the Buzzyfly Digital System. It scores your tasks and picks your #1 for you. More on that later. Next week: the follow-up email people actually answer.`,
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

The break-up email is the one people reply to. It gives them a real deadline. It makes "no" easy to say. Either way, you stop carrying a dead lead in your head.

This week's homework: find one proposal that's gone quiet. Send the right email for where it's at.

These two are in the Digital System's email writer, along with emails for mid-project check-ins, referrals and project wrap-ups. It fills in each client's name and project for you.`,
	},
	{
		subject: "“I'll just build my own”",
		preview: "You can. Here's what it costs.",
		body: `Hi,

You've had three pieces of the system now. A fair thought at this point: "I could build the rest myself."

You can. Here's one more piece, so you can see what building it looks like. The first 48 hours after a client pays.

Within 1 hour of signing:

- Welcome email: what happens next, and when
- Intake form, 5 questions max
- Kickoff call booked

Week one, four touches:

- Day 2: confirm you have everything from intake
- Day 4: first milestone, or a one-line status update
- Day 6: "On track, blocked, or anything changed?"
- Day 7: add them to your follow-up list so week two isn't silence

That's the outline. Turning it into emails you can actually send takes a few evenings. Then you do the same for proposals, scope creep, retention and pricing.

If you enjoy that work, do it. The outlines in these emails are yours to keep.

If you'd rather open one workbook and run it tonight, that's what the Digital System is. Every piece, already written: {store}`,
	},
	{
		subject: "What if it doesn't work for you?",
		preview: "The honest answer, plus a script you can use today.",
		body: `Hi,

The biggest worry with any digital product is simple. What if it's not what I need?

So here's how to judge it before you buy. Read the sample below. If this is useful, the rest will be too.

The refund rule is simple: 30-day refund if you can't get into the app or it isn't what the listing described. Email {supportEmail}. No change-of-mind refunds once you've had access.

Here's the sample. The scope creep line:

> "I can do that. It's outside what we agreed on, so it's a separate line item: [price]. Want me to add it, or keep it for after this project wraps?"

Three rules:

1. Never say yes in the moment. "Let me check and get back to you in an hour."
2. Always name a price, even $25.
3. Always give them the out: "No worries, we stick to the original scope."

The Scope guard tab has replies for the harder moments. Pushback. Endless revisions. "I thought that was included."

If this one isn't useful, the system probably isn't for you. Better to know now.`,
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

Try it on the next thing you quote. See if the number surprises you.

The Digital System does this math for you on the pricing tab. Then it writes the proposal from it. When you're ready: {store}`,
	},
	{
		subject: "Stop rebuilding it from memory",
		preview: "Everything from the last six weeks, in one place.",
		body: `Hi,

Over the last six weeks I've sent you pieces of the system. The weekly reset. The Thursday check. Follow-ups. Onboarding. Scope creep. Pricing.

The Buzzyfly Digital System is all of it in one web app, ready to use:

- Today: who needs a follow-up and what to send
- Follow-ups: every lead and client, with the next date worked out for you
- Email writer: emails that fill in each client's name and project
- Onboarding: a 10-step plan for each new client
- Weekly reset: the Monday plan, a priority scorer, the Thursday check and Friday close, and a log of every week
- Proposals, pricing and scope replies

It opens in your browser on your phone or computer. Nothing to download or install.

Who it's for: one- or few-person businesses where the process lives in your head.

Who it's not for: anyone who already has a documented system that works. You'd be buying what you already have.

$49 once. No subscription. 30-day refund if you can't access the app or it isn't as described.

There's no deadline and no countdown. The price isn't going up on Friday. When you're ready, it's here: {store}

P.S. Got a question before buying? Email {supportEmail}. You're writing to the person who built it.`,
	},
];
