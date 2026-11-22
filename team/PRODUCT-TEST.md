# Product test record

Proof the product works as the listing says. Rerun this before any ad or big
push, and after any change to `/app`. Add the newest run at the top.

## 2026-11-22, Test team: 20 daily checks

How: same as 2026-11-21 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector refused its saved sign-in
again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset` (200), and `/app`, `/app/follow-ups` and `/app/onboarding` stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94, $1,700 and $950 at 80k. `/hourly-rate-calculator` gives $72, then $94. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post, `/app`, `/pt/`, `/pt/store` and `/blog/` (Read links, #320). The homepage screenshot loads (302px wide), and the buy button starts at 771px of 812. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors, including `/pt/` and `/pt/store` (`lang=pt-BR`, one H1 each). |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 83 KB over 10 requests and `/store` 39 KB over 11. DOM-ready in about 1.5 s on a simulated slow line. |
| 15 | Links | PASS | 155 internal links from `/`, `/store`, `/blog/` and 93 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (links only) | `src/` and `public/` have only the 4 links rule 5 allows (`bJebJ3…` ×138, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`), and `check-live-rules` passes. Each `/buy/<id>` goes to its own link. The Stripe connector refused its sign-in, so BACKLOG 0i (the checkout still says Excel) was not re-checked. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS | Direct push 45beb64 (the retention day-14/day-30 post) had a day-14 overclaim, already fixed in #324. It now says the app has the 30-day check-in and that the Day-14 lines can be saved as your own email, which matches the app. The seoTitle is 44 characters. |
| 19 | Rules check | PASS | `check-live-rules` passes. No "instant" claims, no `eVq4gB` or `bJeeVf` link, no $97, no "zip", no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 96 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 95 (not on the `/blog/` index). |

## 2026-11-21, Test team: 20 daily checks

How: same as 2026-11-20 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector refused its saved sign-in
again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset` (200), and `/app`, `/app/follow-ups` and `/app/onboarding` stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94, $1,700 and $950 at 80k. `/hourly-rate-calculator` gives $72, then $94. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store` (new 48px "Try the free demo first" button above the $49 button, #314), a post, `/app`, `/pt/` and `/pt/store`. The homepage screenshot loads (302px wide), and the buy button starts at 771px of 812. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors, including `/pt/` and `/pt/store` (`lang=pt-BR`, one H1 each). |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 83 KB over 10 requests and `/store` 39 KB over 11. DOM-ready in about 1.5 s on a simulated slow line. |
| 15 | Links | PASS | 154 internal links from `/`, `/store`, `/blog/` and 92 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (links only) | `src/` and `public/` have only the 4 links rule 5 allows (`bJebJ3…` ×136, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`), and `check-live-rules` passes. Each `/buy/<id>` goes to its own link. The Stripe connector refused its sign-in, so BACKLOG 0i (the checkout still says Excel) was not re-checked. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS | The only public copy change since 11-20 is the store's "Try the free demo first, no sign-up" button (#314). `/demo` really is the app with 3 sample clients and needs no sign-up. All 8 commits since 11-20 came through PRs. |
| 19 | Rules check | PASS | `check-live-rules` passes. No "instant" claims, no `eVq4gB` or `bJeeVf` link, no $97, no "zip", no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 95 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 94 (not on the `/blog/` index). |

## 2026-11-20, Test team: 20 daily checks

How: same as 2026-11-19 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector refused its saved sign-in
again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset` (200), and `/app`, `/app/follow-ups` and `/app/onboarding` stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94, $1,700 and $950 at 80k. `/hourly-rate-calculator` gives $72, then $94. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post, `/app`, and the new `/pt/` and `/pt/store` (#303). The homepage screenshot loads (302px wide), and the buy button starts at 771px of 812. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors, including `/pt/` and `/pt/store` (`lang=pt-BR`, one H1 each). |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 83 KB over 10 requests and `/store` 38 KB over 11. DOM-ready in about 1.5 s on a simulated slow line. |
| 15 | Links | PASS | 152 internal links from `/`, `/store`, `/blog/` and 90 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every link on `/pt/` and `/pt/store` resolves. Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (links only) | After the fix in #308, `src/` and `public/` have only the 4 links rule 5 allows (`bJebJ3…` ×131, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`), and `/pt/` uses the $49 link. Each `/buy/<id>` goes to its own link. The Stripe connector refused its sign-in, so BACKLOG 0i (the checkout still says Excel) was not re-checked. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS | The day-1 invoice post (1ef47e6): the app's invoice reminders are on days 1, 7 and 14, which matches. The testimonial post (#302): moving a client to "Finished" brings the 30-day check-in with a referral line, which matches. `/pt/` uses the rule-4 refund wording in Portuguese and says no files to download. |
| 19 | Rules check | PASS (fixed) | Direct push 1fea62a (14:08 UTC) added "The Complete Business Bundle is $97" with banned Payment Link `bJeeVf…` to `follow-up-email-after-no-response`. `check-live-rules` blocked it and Deploy run 650 failed, so it never went live. It's removed in #308. Otherwise: no "instant" claims, no `eVq4gB` link, no "zip", no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 93 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 92 (not on the `/blog/` index). |

## 2026-11-19, Test team: 20 daily checks

How: same as 2026-11-18 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector refused its saved sign-in
again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset` (200), and `/app`, `/app/follow-ups` and `/app/onboarding` stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94, $1,700 and $950 at 80k. `/hourly-rate-calculator` gives $72, then $94. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`, with the bigger $49 buttons (1e3f415, 001d0c5, #294). The homepage screenshot loads (302px wide), and the buy button starts at 771px of 812. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 83 KB over 10 requests and `/store` 38 KB over 11. DOM-ready in about 1.6 s on a simulated slow line. |
| 15 | Links | PASS | 145 internal links from `/`, `/store`, `/blog/` and 87 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (links only) | `src/` and `public/` have only the 4 links rule 5 allows (`bJebJ3…` ×126, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` goes to its own link. The Stripe connector refused its sign-in, and this container can't reach buy.stripe.com, so the checkout text in BACKLOG 0i (it still says Excel download) was not re-checked. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | 8 commits were pushed straight to main (6 posts, plus the homepage and store buttons). 2 overclaims are fixed. `scope-creep-exact-reply-after-hours-text` said "the same reply" lives in the app, but the app's scope reply is worded differently (quote it, "go ahead or keep it for later"). `client-onboarding-checklist-template` called the app "the same checklist", but the post's Day 0–7 differs from the app's 10 steps (kickoff Day 3, not Day 4). Both now describe what the app really has. A 9th direct push (4068b9e, 14:11 UTC) broke the build: its seoTitle was 61 characters (the limit is 60), and it claimed "the same reply" and "the log" live in the app. The title is shortened to 59 and the app claims corrected. The day-7 invoice post (days 1, 7 and 14), the first-delivery email ("one list of changes") and the free weekly reset on the homepage are accurate. |
| 19 | Rules check | PASS | No "instant" claims, no `eVq4gB` link, no $97, no invented views or dates, no "zip", no placeholders on public pages, no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 90 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 89 (not on the `/blog/` index). |

## 2026-11-18, Test team: 20 daily checks

How: same as 2026-11-17 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector refused its saved sign-in
again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset` (200), and `/app`, `/app/follow-ups` and `/app/onboarding` stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94, $1,700 and $950 at 80k. `/hourly-rate-calculator` gives $72, then $94. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`. The homepage screenshot loads (302px wide), and the buy button starts at 771px of 812. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 83 KB over 10 requests (down from 117 KB after the srcset image, #282). `/store` is 38 KB over 11 with the new hero image (#280). DOM-ready in about 1.6 s on a simulated slow line. |
| 15 | Links | PASS | 141 internal links from `/`, `/store`, `/blog/` and 84 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (links only) | `src/` and `public/` have only the 4 links rule 5 allows (`bJebJ3…` ×117, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` goes to its own link. The Stripe connector refused its sign-in, and this container can't reach buy.stripe.com, so the checkout text in BACKLOG 0i (it still says Excel download) was not re-checked. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS (fixed) | 4 posts were pushed straight to main (f7735bc, b6077b2, 7469d30, 79c0e64). `client-says-im-busy-exact-follow-up` said the app "includes the busy-client reply" and that it "lives inside" the app. The app has no such email, but buyers can save their own, so it now says to save the reply as your own email. The day-3 post's app claims (day 3/7/14 follow-ups, 20-minute reset) are accurate. The other two posts only add advice for your own notes. |
| 19 | Rules check | PASS | No "instant" claims, no `eVq4gB` link, no $97, no invented views or dates, no "zip", no placeholders on public pages, no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 87 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 86 (not on the `/blog/` index). |

## 2026-11-17, Test team: 20 daily checks

How: same as 2026-11-16 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector refused its saved sign-in
again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset` (200), and `/app`, `/app/follow-ups` and `/app/onboarding` stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94, $1,700 and $950 at 80k. `/hourly-rate-calculator` gives $72, then $94. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`. The homepage screenshot loads (302px wide), and the buy button starts at 771px of 812. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 117 KB over 10 requests and `/store` 38 KB over 10. DOM-ready in about 1.6 s on a simulated slow line. |
| 15 | Links | PASS | 139 internal links from `/`, `/store`, `/blog/` and 82 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (src only) | `src/` has only the 4 links rule 5 allows (`bJebJ3…` ×114 across `src/` and `public/`, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` goes to its own link. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS | No public copy changed since 11-16. The only site change is CSS (#164, #274): inline article links are now underlined, so links no longer rely on colour alone, and the blog headings are restyled. The 3 free tools still have 2 buttons of at least 44px and no sideways scroll at 375px and 1280px. |
| 19 | Rules check | PASS | No "instant" claims, no `eVq4gB` link, no $97, no invented views or dates, no "zip", no placeholders on public pages, no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 85 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 84 (not on the `/blog/` index). |

## 2026-11-16, Test team: 20 daily checks

How: same as 2026-11-15 (local D1 with every migration, test keys in the
LOCAL `download_tokens` only, Playwright at 375px and 1280px, an uncommitted
config copy without the `ai` binding). The Stripe connector still needs signing
in again, so check 16 read `src/`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Lock | PASS | `/app` with no key or a bad key: 402. The system key opens `/app`. A $15 key opens only `/app/reset` (200), and `/app`, `/app/follow-ups` and `/app/onboarding` stay at 402. |
| 2 | Today list | PASS | Proposal 5 days ago: "First proposal follow-up". Invoice due 9 days ago: "a week overdue". New client today: welcome and intake only. |
| 3 | Email writer | PASS | All 21 emails fill in name, project, date and sign-off, with no raw `{placeholders}`. |
| 4 | Copy / open in email app | PASS | The clipboard and the `mailto:` link carry the same filled subject and body. |
| 5 | Mark sent | PASS | The item clears. "Second proposal follow-up" comes up next. |
| 6 | Weekly reset counts | PASS | 1 open invoice ($800), 1 follow-up due, 2 onboarding steps, matching the test clients. |
| 7 | Scope and proposal replies | PASS | All 6 open and fill. |
| 8 | Pricing maths | PASS | App: $72/h, $1,300 and $750, then $94, $1,700 and $950 at 80k. `/hourly-rate-calculator` gives $72, then $94. |
| 9 | Data, backup, restore | PASS | Clients survive reload. The backup has 3 clients and the sign-off. Restore works. |
| 10 | Smaller apps | PASS | The system key opens all 3 (200) with shared clients. Follow-Ups has 9 emails, Onboarding 6, and Reset shows Monday, This week and Log. |
| 11 | Phone 375px | PASS | No sideways scroll and 0 targets under 44px on `/`, `/store`, a post and `/app`. The homepage screenshot loads (302px wide), and the buy button starts at 771px of 812. |
| 12 | Desktop 1280px | PASS | No sideways scroll and no JS errors. |
| 13 | Accessibility | PASS | One H1, no heading skips, no missing alt text, no low contrast found, and focus rings show. |
| 14 | Speed | PASS | `/` is 117 KB over 10 requests and `/store` 38 KB over 10. DOM-ready in about 1.6 s on a simulated slow line. |
| 15 | Links | PASS | 139 internal links from `/`, `/store`, `/blog/` and 82 posts: 0 broken (`/kids` gives 503 locally only, because it is the KIDS worker). Every post ends on a buy link or `/store`. |
| 16 | Buy path | PASS (src only) | `src/` has only the 4 links rule 5 allows (`bJebJ3…` ×114 across `src/` and `public/`, `5kQ7sN…`, `fZubJ3…`, `3cI8wR…`). Each `/buy/<id>` goes to its own link. |
| 17 | Thank-you page | PASS | Paid test session: "Your app is ready." and `/app` opens. Unknown session: "Checking your payment…", then "We can't confirm this payment yet." Missing session: "Already bought a Buzzyfly app?". |
| 18 | Copy check | PASS | The new buy boxes on the 3 free tools in `public/tools/` (#269) check out: onboarding has 10 steps, each with a day, plus the welcome, intake and kickoff emails. Follow-ups get a date and show on Today, and the buyer sends them. The Monday reset is 20 minutes (3+5+2+5+3+2), and its scorer picks the #1. Each box links the allowed $49 link, uses the rule-4 refund line, and has 2 buttons of at least 44px with no sideways scroll at 375px or 1280px. |
| 19 | Rules check | PASS | No "instant" claims, no `eVq4gB` link, no $97, no invented views or dates, no "zip", no placeholders on public pages, no `coachmanager@` in rendered HTML, one refund wording, and the liability section is present. |
| 20 | Search check | PASS | 85 pages: one title, one description and one H1 each, with no duplicates. JSON-LD on 84 (not on the `/blog/` index). |

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
