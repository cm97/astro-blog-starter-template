# Product test record

Proof the product works as the listing says. Rerun this before any ad or big
push, and after any change to `/app`. Add the newest run at the top.

## 2026-11-14, Test team: 20 daily checks

How: same as 2026-11-13 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector still needs signing
in again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset`, and the other three stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94 at 80k. `/hourly-rate-calculator` gives the same floor. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`. The homepage screenshot loads (302px wide), and the buy button starts at 771px of 812. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 117 KB over 10 requests and `/store` 38 KB over 10. DOM-ready in about 1.6 s on a simulated slow line. |
| 15 | Links | PASS | 139 internal links from `/`, `/store`, `/blog/` and 82 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (src only) | `src/` has only the 4 links rule 5 allows (`bJebJ3…` ×111, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` goes to its own link. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | The new store FAQ (#258) checks out: day 3/7/14 proposal follow-ups, invoice reminders and onboarding steps match the app, and `/demo/` really is the app with 3 sample clients (Jane Rivera, Priya Shah, Acme Studio) and nothing saved to storage. One overstatement fixed: it said the app shows "the scope replies when they're due", but scope replies aren't scheduled. It now says it "keeps the scope replies ready to copy". The day-14 invoice post (5478a19) is accurate. |
| 19 | Rules check | PASS | No "instant" claims, no `eVq4gB` link, no $97, no invented views or dates, no "zip", no placeholders on public pages, no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 85 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 84 (not on the `/blog/` index). |

## 2026-11-13, Test team: 20 daily checks

How: same as 2026-11-12 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector still needs signing
in again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset`, and the other three stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94 at 80k. `/hourly-rate-calculator` gives the same floor. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`. The homepage buy button still starts in the first screen (771px of 812). |
| 12 | Desktop 1280px | PASS (fixed) | FAIL before the fix: the first screen of `/` showed a grey box reading "Placeholder: replace /images/today-dashboard.svg" (direct push a2802f4), and its alt text claimed it showed the dashboard. It is now a real 1200×750 screenshot of the app's Today list with example clients marked "(example)" (`today-dashboard.jpg`, 59 KB), and the alt text describes it. No JS errors. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 117 KB over 10 requests (the screenshot added 59 KB) and `/store` 37 KB over 10. DOM-ready in about 1.6 s on a simulated slow line. |
| 15 | Links | PASS | 138 internal links from `/`, `/store`, `/blog/` and 81 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (src only) | `src/` has only the 4 links rule 5 allows (`bJebJ3…` ×109, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). `/demo/`'s button (#251) now goes straight to `bJebJ3…`. Each `/buy/<id>` goes to its own link. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | FAIL before the fix: `can-you-just-add-this-exact-reply` claimed a "change-order one-pager" and a "scope log" in the app, and `client-follow-up-after-no-response-day-7-exact-nudge` claimed "day-3 and day-10 templates, the log". The app has the out-of-scope reply, "Confirm a change in writing", and day 3/7/14 follow-ups. Both posts now say that. The invoice day-7 post (day 1/7/14) was already accurate. |
| 19 | Rules check | PASS | No "instant" claims, no `eVq4gB` link, no $97, no invented views or dates, no "zip", no `coachmanager@` in rendered HTML, one refund wording (also on the demo button), and the liability section is present. |
| 20 | Search check | PASS | 84 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 83 (not on the `/blog/` index). |

## 2026-11-12, Test team: 20 daily checks

How: same as 2026-11-11 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector still needs signing
in again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset`, and the other three stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94 at 80k. `/hourly-rate-calculator` gives the same floor ($72, then $94). |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`. The bigger homepage CTA (7dc9c1f) fits. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 58 KB over 9 requests and `/store` 37 KB over 10. DOM-ready in 1.4–1.6 s on a simulated slow line. |
| 15 | Links | PASS | 133 internal links from `/`, `/store`, `/blog/` and 79 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (src only) | `src/` has only the 4 links rule 5 allows (`bJebJ3…` ×104, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` goes to its own link. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | FAIL before the fix: `proposal-quiet-5-days-exact-nudge` (direct push bdf1084) said "the same day-5 nudge … the log" live inside the app. The app has day 3, 7 and 14 proposal follow-ups and no day-5 nudge. The post now says that and points to saving the nudge as your own email. Checked as true: the net-60 post's "50% to start, 50% on delivery" is in the app's proposal template. |
| 19 | Rules check | PASS | The homepage guarantee (2c1f8be/7dc9c1f) uses the rule 4 short form. No "instant" claims, no `eVq4gB` link, no $97, no invented views or dates, no "zip", no `coachmanager@` in rendered HTML, and the liability section is present. |
| 20 | Search check | PASS | 82 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 81 (not on the `/blog/` index). |

## 2026-11-11, Test team: 20 daily checks

How: same as 2026-11-10 (local D1 with every migration, test keys in the LOCAL
`download_tokens` only, Playwright at 375px and 1280px, an uncommitted config
copy without the `ai` binding). The Stripe connector still needs signing in
again, so check 16 read `src/`. Also tested: the new free `/hourly-rate-calculator` (#230).

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset`, and the other three stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94 at 80k. The new `/hourly-rate-calculator` gives the same floor ($72, then $94), $1,435 a week, a $288 half-day, and "$30,800 a year short" at $60/h. All checked by hand. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post, `/app` and `/hourly-rate-calculator`. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors on the same pages. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 58 KB over 9 requests and `/store` 37 KB over 10. DOM-ready in 1.4–1.6 s on a simulated slow line. |
| 15 | Links | PASS | 127 internal links from `/`, `/store`, `/blog/` and 76 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (src only) | `src/` has only the 4 links rule 5 allows (`bJebJ3…` ×98, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` goes to its own link. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | FAIL before the fix: the direct-pushed `friday-4-minute-pipeline-close` said its "four rows and the exact lines" live inside the app. The app's Friday close has different fields. The post now names the real 10-minute Friday close (money in, what slipped, the first task for Monday), the Today list and saved custom emails. The homepage trust row (#228) matches the store. |
| 19 | Rules check | PASS | No "instant" claims, no `eVq4gB` link, no $97 bundle, no invented views or dates, no "zip", no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 79 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 78 (not on the `/blog/` index). |

## 2026-11-10, Test team: 20 daily checks

How: same as 2026-11-06 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector still needs signing
in again, so check 16 read `src/`. Runs for 2026-11-07, 08 and 09 were missed
because the test session was down, so this run covers every change since 2026-11-06.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset`, and the other three stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | $72/h, $1,300 and $750 by default. Income 80k gives $94, $1,700 and $950. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 58 KB over 9 requests and `/store` 37 KB over 10. DOM-ready in 1.4–1.6 s on a simulated slow line. |
| 15 | Links | PASS | 126 internal links from `/`, `/store`, `/blog/` and 75 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (src only) | `src/` has only the 4 links rule 5 allows (`bJebJ3…` ×94, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` goes to its own link. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | FAIL before the fix: 4 posts claimed app content that doesn't exist: "deposit follow-ups" (twice), "the log" next to the proposal close, and "day 3/6/12" lines "ready" in the app, which actually has days 3, 7 and 14. Each now describes the real day-1 "Confirm the deposit is paid" step, the day 3/7/14 follow-ups and saved custom emails. |
| 19 | Rules check | PASS (fixed) | FAIL before the fix: the direct push 3d0d111 put invented view counts ("2.4K views") and fake upload dates ("2 days ago") on `/videos`, and renamed the $49 web app "checklists, templates & scripts in one zip" (rule 3, plus the CLAUDE.md ban on invented stats and dates). `src/data/videos.ts` and `src/pages/videos.astro` are restored to 1653132, the last checked version. The rendered `/videos` pages now show 0 view counts, 0 "ago" dates and no "zip". Also checked: no "instant" claims, no `eVq4gB` link, no $97, no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 78 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 77 (not on the `/blog/` index). |

## 2026-11-06, Test team: 20 daily checks

How: same as 2026-11-05 (local D1 with every migration, test keys in the LOCAL
`download_tokens` only, Playwright at 375px and 1280px, an uncommitted config
copy without the `ai` binding). The Stripe connector still needs signing in
again, so check 16 read `src/` and the built pages.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset`, and the other three stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | $72/h, $1,300 and $750 by default. Income 80k gives $94, $1,700 and $950. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 58 KB over 9 requests and `/store` 37 KB over 10. DOM-ready in 1.4–1.6 s on a simulated slow line. |
| 15 | Links | PASS | 119 internal links from `/`, `/store`, `/blog/` and 69 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (fixed) | FAIL before the fix: the direct push 64d7a5d added a "$97 Complete Business Bundle" with a 5th Stripe link (`bJeeVf…`) to `20-minute-weekly-reset-for-solo-operators`, against CLAUDE.md rule 5. Removed. `src/` and the built site now have only the 4 allowed links, and each `/buy/<id>` goes to its own link. Stripe settings weren't read (the connector needs signing in again). |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | FAIL before the fix: `three-days-behind-exact-client-update` said the app "already has the template" for a late-delivery update. It doesn't. The post now says the app has the Monday reset and the weekly log, and that you can save the update as your own email. |
| 19 | Rules check | PASS (fixed) | The $97 bundle is the only rule break (see 16), and it is now removed. No "instant" claims, no `eVq4gB` link, no `coachmanager@` in rendered HTML, one refund wording (also on `/es/`), and the liability section is present. |
| 20 | Search check | PASS | 72 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 71 (not on the `/blog/` index). |

## 2026-11-05, Test team: 20 daily checks

How: same as 2026-11-04 (local D1 with every migration, test keys in the LOCAL
`download_tokens` only, Playwright at 375px and 1280px, an uncommitted config
copy without the `ai` binding). The Stripe connector still needs signing in
again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset`, and the other three apps stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off. No raw `{placeholders}`. Only the deliberate [bracket] blanks are left. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:jane@example.com` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the 3 test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | $72/h, $1,300 and $750 by default. Income 80k gives $94, $1,700 and $950. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore after clearing storage works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors on the same pages. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 58 KB over 9 requests and `/store` 37 KB over 10. Both are DOM-ready in 1.4–1.6 s on a simulated slow line (400 kbps, 400 ms). |
| 15 | Links | PASS | 116 internal links from `/`, `/store`, `/blog/` and 67 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (src only) | `src/` has only the 4 links rule 5 allows (`bJebJ3…` ×72, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` redirects to its own link. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | FAIL before the fix: 3 posts said the app has a "wrap-up checklist", a "close-out" checklist and the day-1 and day-7 referral emails. It doesn't. It has the 30-day check-in (with a referral line), the retainer offer and saved custom emails. The posts now say exactly that. |
| 19 | Rules check | PASS | No "instant" claims, no `eVq4gB` link and no `coachmanager@` in rendered HTML. One refund wording everywhere (the direct push b800d59 with "files not delivered" wording was already reverted on main). Liability section present. No $97. |
| 20 | Search check | PASS | 70 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 69 (not on the `/blog/` index). |

## 2026-11-02, SEO Master: $49 Digital System, full buyer walk-through

How: the site ran locally (`wrangler dev`) with every D1 migration applied. I
issued a buyer access key the same way a paid order does (a `download_tokens`
row for `buzzyfly-digital-system`), then drove the app with Playwright at phone
size (375px) and desktop size (1280px).

| Listing claim | Result |
|---|---|
| Locked to buyers | PASS. `/app` with no key returns 402. A valid key redirects to `/app` and unlocks. |
| "Today dashboard: who needs you and what to send" | PASS. A proposal sent 5 days ago shows "Due now: First proposal follow-up". An invoice 9 days old shows "a week overdue". A new client gets 4 onboarding steps with due dates. |
| "Writes the email" | PASS. A day-3 proposal follow-up came back with the client's name, the project, the sent date and the sign-off filled in. One `[start date]` blank is flagged to fill in. 21 built-in emails, plus custom ones. |
| Copy, or open in your email app | PASS. "Copy email" fills the clipboard, and "Open in my email app" builds a correct `mailto:` link with the subject and body. |
| Follow-ups move on | PASS. "Mark as sent" clears the item and schedules the next one (Nov 4). |
| Weekly reset | PASS. A 6-step, 20-minute Monday reset with live counts (open invoices, follow-ups due, onboarding due), plus a priority scorer. |
| Proposal and scope replies | PASS. Templates for discounts, retainers, out-of-scope requests, change confirmations and used-up revisions. |
| Pricing | PASS. The hourly floor and project and retainer prices calculate. |
| Data kept | PASS. Clients and the sign-off survive reload and reopen. Backup downloads as JSON with every client. |
| Smaller apps share data | PASS. The system key opens `/app/follow-ups` and `/app/onboarding` (same clients) and `/app/reset` (all three return 200). |
| Works on phone | PASS. No sideways scroll at 375px or 1280px. No JavaScript errors on any screen. |
| Store page discloses limits | PASS. The FAQ says the client list is saved on the buyer's own device and that there's no account. |

Payment hand-off (live Stripe, read-only check): the store's Payment Link
`bJebJ3…` is active, with `item_id=buzzyfly-digital-system`. After payment it
redirects to `https://buzzyfly.com/thank-you?s={CHECKOUT_SESSION_ID}`, and its
checkout text matches CLAUDE.md rule 4.

Not tested: a real card payment end to end (it would charge real money), the
delivery email, and PayPal.

Found: the live Stripe account has 7 other **active** Payment Links that are
not on the site: a second $49 Digital System link (`eVq8wR…`), the $5 Jobs
membership, "budget-planner", "Shelf Ops Kit" (promises file downloads), a
kids "family pass" subscription with a 7-day trial, and two "Lumen" frame
packs. Anyone who still has one of those URLs can pay. The owner decides which
to turn off.
