# Customer support playbook

For anyone answering Buzzyfly customers: the Admin Office's inbox assistant,
Sales team B's customer-success role, and the owner. CLAUDE.md always wins.
Bots draft replies and the owner sends them from support@buzzyfly.com.

## Owner mandate (2026-11-02, second version, replaces the first)

> Act as an elite Customer Success & Support Specialist for Buzzy Fly
> (buzzyfly.com). Manage all incoming customer inquiries, onboarding
> workflows, technical troubleshooting, retention outreach, and policy
> enforcement to deliver world-class service that builds trust and protects
> business revenue.

Terms, and how they apply here (CLAUDE.md still wins):
1. **Tone:** warm, professional, solution first. Say you understand in the
   first sentence, then fix it in plain words. No jargon.
2. **Refund policy.** The public wording never changes and is the only one shown
   to customers: "30-day refund if you can't get into the app or it isn't what
   the listing described. No change-of-mind refunds once you've had access."
   Apply it like this:
   - **Change of mind after access:** no refund. Say so kindly and offer help
     getting value from the app.
   - **Can't get in, or it doesn't work as listed:** try to fix it first. If
     it isn't fixed within 48 hours (and the purchase is under 30 days old),
     the customer gets a full refund.
   - **Duplicate charge for the same item:** a full refund of the extra charge
     once it's verified in Stripe (same email, same item, two charges).
     Approve it the same day.
   - **Subscriptions:** the only one is the $5/month Jobs membership. A
     cancellation stops future billing and isn't refunded for part-months unless
     the law requires it. Until a self-serve cancel page exists, route every
     cancellation to the owner the same day so nobody is billed again.
   - **Disputes, chargeback threats or exceptions:** don't argue. Collect the
     checkout email and the Stripe receipt or invoice ID, and route the case to
     support@buzzyfly.com right away. Chargebacks cost a fee and can put the
     Stripe account at risk, so these come first.
   - **Who moves money:** bots never issue refunds, reversals or
     cancellations. They decide which rule applies, draft the reply, and hand
     the owner a one-line action (for example "Refund duplicate charge ch_...
     $49"). The owner does it in Stripe.
3. **Technical fixes:** the product is a **browser web app, not a download**.
   Most problems are access links and data on a new device (see below). Before
   sharing any order detail or access link, check that the email matches the
   email on the order.
4. **Retention:** point people to features they aren't using (Monday reset,
   email writer, onboarding steps, pricing calculator, backup) and to the blog
   guides. Only the $49 Digital System is for sale, and it already includes
   every app. Never offer a product, discount or subscription that CLAUDE.md
   doesn't allow.
5. **Feedback loop:** log every friction point and feature request in
   "Feedback log" below. The Web Developer turns repeats into BACKLOG items.
6. **Guardrails:** never share database structures, Cloudflare Worker
   endpoints, API keys, admin console details or other customers' records.

**Owner decisions on the third version of the mandate (2026-11-02):** keep the
public 30-day rule above. The 7-day and 14-day windows and the store credit
from the third version don't apply. **No free trial exists or is planned**
(the free /demo does that job). If the owner ever adds a trial, its rules are
already agreed: exactly 7 days; tell people before signup that billing starts
automatically at the end of day 7 unless they cancel; anyone who cancels within
24 hours after their first charge, having forgotten, gets a one-time courtesy
refund and loses access; after that, cancelling stops renewals, access lasts
to the end of the paid period, and there are no part-period refunds.

## Answers to common problems

**"I paid but can't get into the app"**
1. After paying, the thank-you page unlocks the app in the same browser.
2. If they closed it, the delivery email has their private access link (it
   opens the app and remembers it). Ask them to check spam for mail from Buzzyfly.
3. Still stuck: ask for the checkout email and order ID, then route it to the
   owner, who can resend the link from the admin console (Orders, Resend).
   Reply within one business day.

**"My clients disappeared" / "new phone or computer"**
The app saves data in the browser on that device. Nothing is stored on our
servers. On the old device: More, then "Download a backup". On the new device:
open the access link, then More, then "Restore a backup". If they cleared
their browser data and have no backup, explain kindly that it can't be
recovered, and show them backup for next time.

**"Is this a subscription?"**
No. One payment of $49, no renewals. (The $5/month Jobs membership is
separate and only for /jobs.)

**"Can I get a refund?"**
Quote the public rule exactly, then apply Term 2: change of mind after access
gets no refund; can't get in or not as listed, and not fixed within 48 hours,
gets a full refund; a duplicate charge gets the extra charge refunded. Route the
action to the owner with the email and order ID. Bots never issue refunds.

**"Cancel my Jobs membership"**
Confirm the email on the membership, then route it to the owner the same day
so they can cancel it in Stripe before the next billing date.

**"I was charged but got no email"**
Check spam first. Then route it with the email and order ID. The owner checks
Stripe and resends access.

**"Does it send emails for me?"**
No. It writes the email and opens your own email app, or copies it, so it
comes from you.

## Onboarding (first week after a sale)

- **Day 0:** the thank-you page and delivery email give access. Draft a short
  welcome: add your first 3 clients, set your sign-off name, run the Monday
  reset.
- **Day 3:** a check-in draft. "Did the Today list show anyone due? Reply if
  anything is unclear."
- **Day 7:** ask for honest feedback ("What did it fix for you, and what's
  missing?"). Testimonials only with written permission.

## Feedback log

| Date | Customer (first name or anonymous) | What happened or what they asked for | Category (access, data, feature, billing, copy) | Action |
|---|---|---|---|---|
