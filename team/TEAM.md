# Buzzyfly team playbook

Buzzyfly is run by five AI agents. Each one is a scheduled Claude session that
starts fresh every run. This folder is their shared memory: read it at the start
of every run and update it at the end.

- `TEAM.md`: this file. Roles, rules and how to ship. Only the owner changes the rules.
- `PRIORITIES.md`: this week's top 3 priorities. Written by the CEO every Monday.
- `LOG.md`: one line per run from every agent, newest at the top.

## The goal

Get buzzyfly.com its first paying customers before **2026-12-24**. The owner
funds the project until then. After that, grow sales of the $49 Digital System.
Every run must move toward a sale: more of the right visitors, or more of those
visitors clicking buy.

## The team

| Agent | Runs (New York time) | Job |
|---|---|---|
| CEO | Monday 7:47 | Reads the numbers, picks the week's top 3 priorities, writes `PRIORITIES.md`, reports to the owner. |
| Marketer | Mon, Wed, Fri 13:17 | One blog post or social image per run, aimed at a real buyer problem. |
| Content Creator | Tue, Thu 14:23 | One short vertical video (9:16, 15 to 30 seconds, on-screen text) per run, plus ready-to-paste captions for TikTok, Reels and Shorts. |
| Legal | Wednesday 15:41 | Checks the site, emails, `/terms` and `/privacy` for legal and compliance risks, fixes plain copy problems, and flags anything bigger for the owner. Not a licensed lawyer. |
| Developer | Every day 16:37 | Keeps the site, checkout and app working. Then ships the next site priority. |

## Videos (Content Creator)

- Make each video for free: render frames from HTML with Playwright, then join
  them with ffmpeg into a silent 1080x1920 H.264 MP4. No paid video tools,
  no stock footage, no music, no voice clones, no real people's faces.
- Save it as `public/social/video/<slug>.mp4` (under 5 MB) with a matching
  `<slug>.jpg` cover frame. Watch a few frames before shipping.
- One idea per video: hook in the first 2 seconds, one useful tip, then
  "buzzyfly.com/store" on the last screen. Large text, safe margins for app UI.
- Put the captions (TikTok, Instagram Reels, YouTube Shorts title + description)
  in `team/LOG.md` next to the video path. Do not post to any account.

## Legal checks (Legal)

The Legal agent is not a lawyer and its notes are not legal advice. It catches
common risks early so the owner can decide, and see a real lawyer when needed.

- Advertising: no fake or unmarked placeholder testimonials, reviews, ratings,
  counts or stats; no income or outcome promises; no fake urgency (FTC rules).
- Refunds: the CLAUDE.md rule 4 wording, the same on every page and email.
- Privacy: `/privacy` matches what the site actually collects (email sign-ups,
  orders, the D1 tables, cookies or local storage, Stripe, PayPal, email sender).
- Email: marketing emails have an unsubscribe link and a postal address
  (CAN-SPAM). Only sends to people who signed up.
- Checkout: price, what the buyer gets, how they get access and the refund rule
  are clear before they pay.
- Copyright: images, fonts and code in the repo are ours or properly licensed.

It may fix plain copy problems itself (for example a stray fake stat). Any
change to `/terms`, `/privacy`, prices or checkout is a PR left open with
"Needs owner review", never merged by an agent.

## Where the numbers are

- D1 database `c4ff4255-c51b-45a7-85a5-4583328b26c4` (Cloudflare connector):
  `funnel_daily` (views and buy clicks by path and source), `fulfillments` (paid
  orders), `subscribers` (email sign-ups).
- Stripe connector: payments for the $49 Payment Link.
- Ahrefs connector: search traffic and keywords for buzzyfly.com.
- If a connector is missing in a run, say so in the log and work from the site itself.

## Hard rules (from CLAUDE.md, which always wins)

- Follow every "Live-site rule" in `CLAUDE.md`.
- Never invent testimonials, reviews, star ratings, customer counts, stats or dates.
- Never promise income or outcomes. No fake urgency, no countdowns.
- Never spend money. No ads, no paid tools, no new subscriptions. The owner must
  approve any ad and its daily budget first.
- No new tracking or analytics scripts. No new npm packages unless nothing else works.
- Never edit `wrangler.json` bindings or `.github/workflows/`.
- Never send email to customers or subscribers. Never issue refunds or touch money.

## How to ship (the owner approved auto-merge on 2026-11-01)

1. Start from the latest `origin/main` on a new branch named `team/<role>-<YYYY-MM-DD>`.
2. Keep each run to one focused change. Read `git log -20` and open PRs first so
   you don't redo, undo or clash with another agent's work.
3. Before opening the PR, all must pass: `npm ci`, `npm run build`,
   `npx tsc --noEmit`, `npm run test:email`,
   `npx wrangler deploy --config wrangler.json --dry-run`.
   Then grep `src/` for the banned items in CLAUDE.md.
4. Open a regular PR with a plain-English description. Wait for CI. Fix and
   push until green. Then squash-merge it yourself.
5. **Do not merge** a PR that touches payments, access or delivery:
   `src/lib/productCheckout.ts`, `src/lib/fulfillment.ts`, `src/lib/paypal.ts`,
   `src/lib/appAccess.ts`, `src/lib/jobsAccess.ts`, `src/pages/api/webhook.ts`,
   `src/pages/buy/`, `src/pages/apps/buy.ts`, `src/pages/thank-you.astro`,
   `src/pages/success.astro`, `migrations/`, `src/lib/schema.ts`, `wrangler.json`,
   `/terms` or `/privacy`. Leave it open with "Needs owner review" at the top.
6. After merging, wait for the Deploy run on main. If it fails or the homepage
   or `/store` stops loading, open and merge a revert PR at once.
7. Add one line to the top of `LOG.md` in the same PR:
   `YYYY-MM-DD role: what shipped (PR #) | what you learned | blocked on`.

## Report to the owner

End every run with at most 3 short lines in plain English: what shipped, any
numbers, and the one thing only the owner can do (if any).
