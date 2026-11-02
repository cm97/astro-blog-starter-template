# Newsletter ad copy: November 2026 test ($176 total)

The link goes to `/store`. Each ad has its own UTM tag. The site already saves it on signups and Stripe orders (`src/lib/trafficSource.ts`). So /admin's signups-and-orders-by-source table shows which newsletter sold. No new tracking script.

Rules followed: no "instant", no outcome promises, no stats or testimonials, one payment, refund wording as on /terms.

---

## 1. The Freelance Gig: Bonus Points link ($27)

The slot is one link in a curated list, so the ad is a headline, a short line and a link.
Book here: https://www.passionfroot.me/the-freelance-gig (pick "Bonus Points Link")

**Link:** `https://buzzyfly.com/store?utm_source=thefreelancegig&utm_medium=newsletter&utm_campaign=nov26_test`

**Title:** Who to follow up with today, and the email to send

**Line (if they allow one):** Buzzyfly is a browser app for freelancers. It covers follow-ups, new-client onboarding and a Monday reset. $49, one payment.

> They pointed people to a blog post in this slot before, so a post may fit better than the store page. Backup link if they'd rather have content:
> `https://buzzyfly.com/blog/client-ghosted-after-proposal?utm_source=thefreelancegig&utm_medium=newsletter&utm_campaign=nov26_test`

---

## 2. Lizzie Davey (Friday Freelance Tips): One-liner call-out ($49)

Limit: 50 words, 1 link.
Book here: https://www.passionfroot.me/lizziedavey (pick "One-liner call out")

**Link:** `https://buzzyfly.com/store?utm_source=lizziedavey&utm_medium=newsletter&utm_campaign=nov26_test`

**Copy (46 words):**

> Sent a proposal and the client went quiet? Buzzyfly is a browser app that shows who to follow up with today and fills in the email for you to send. It also covers onboarding for new clients and your Monday reset. $49, one payment. **See Buzzyfly →**

---

## 3. Freelance Writing Opps: Classified ad ($100)

Text-only, mid-newsletter, 1 link. Readers come for job leads, so the ad opens on the moment after you pitch.
Book here: https://www.passionfroot.me/freelance-writing-opps (pick "Classified Ad")

**Link:** `https://buzzyfly.com/store?utm_source=freelancewritingopps&utm_medium=newsletter&utm_campaign=nov26_test`

**Copy:**

> **Pitched it. Heard nothing. Now what?** Buzzyfly shows which clients and leads to follow up with today, with the email filled in and ready to send. It also lays out a new client's first ten days. Works in your browser and on your phone. $49, one payment. 30-day refund if you can't access the app or it isn't as described. **Take a look →**

---

## Booking notes for the owner

- Pay on each Passionfroot page. Paste the copy and the link exactly as above.
- Ask each publisher to keep the UTM link exactly as written. Some link shorteners strip the tags.
- After each issue goes out, open /admin. Look at the signups-and-orders-by-source table for `thefreelancegig`, `lizziedavey` and `freelancewritingopps`. The tag stays with a visitor for 30 days, so a later purchase still counts.
