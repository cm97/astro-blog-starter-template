# DESIGN.md — Buzzyfly

## Theme
Calm, organized, confident. A light page with lots of white space, where one yellow button tells a busy solo coach exactly what to do next.

Every element on the page earns its place by moving a visitor toward buying or opting in. Anything that does not is cut.

**Who it's for:** solo coaches in their first few years who don't consider themselves techy. They should feel relief within five seconds, like someone finally got organized for them.

**Borrowed from:**
- **Notion:** calm, clean surfaces and generous white space.
- **Stripe:** confident headlines and pricing you can read at a glance.
- **Google:** plain layouts with one obvious next step.

**Avoided:** ClickFunnels-style pages with countdown timers, hype and pressure.

## Palette (roles, not moods)
| Role | Hex | Use |
| --- | --- | --- |
| Background | #FFFFFF | Page ground |
| Surface | #F7F7F5 | Alternate sections, cards, input fills |
| Ink | #1A1A1A | Headlines, body text, links |
| Muted ink | #5F5F66 | Secondary text, captions, fine print (6.5:1 on white) |
| Hairline | #E5E5E2 | Card borders, dividers |
| Accent | #F5BE14 | Buzzyfly yellow. Primary button fill only. |
| Accent hover | #E0A800 | Primary button hover |
| On accent | #1A1A1A | Text on the yellow button (about 10:1 contrast) |
| Success | #1E7B45 | Form confirmation messages only |
| Error | #B3261E | Form error messages only |

Use the accent for one action per screen, never for decoration. Never put yellow text on a white background, because it fails contrast. Links are ink with an underline. Focus rings are 2px ink with a 3px offset.

## Type
- **Display:** Bricolage Grotesque, weights 700 and 800, tracking -0.02em. Use it for headlines and prices.
- **Body:** Instrument Sans, weights 400 and 600. Use it for everything else.
- Both are self-hosted woff2 files. There is no font CDN.
- **Sizes (mobile → desktop):**
  - H1: 40px → 64px, line-height 1.05
  - H2: 28px → 40px
  - H3: 20px → 24px
  - Body: 18px, line-height 1.6
  - Small: 14px
- Keep line length at 65 characters or fewer.
- Never use Inter, Roboto, Arial or system defaults.

## Components
- **Primary button:** pill, 48px tall (44px minimum), #F5BE14 fill, #1A1A1A text, weight 600. Use one per screen. The label names the product and price, for example "Get the Digital System — $49".
- **Secondary button:** pill, 48px tall, transparent fill, 1px #1A1A1A border at 20% opacity, ink text. Use it for every other action.
- **Cards:** 16px radius, 1px #E5E5E2 border, #FFFFFF or #F7F7F5 fill, no drop shadow.
- **Recommended product card:** the "Most popular" $49 Digital System gets a larger card, a 2px #1A1A1A border and the only yellow button.
- **Price block:**
  - Show the price in Bricolage Grotesque 800.
  - Show a crossed-out price only where it is true, which is the bundle compared with buying each piece separately.
  - Put the guarantee line directly under the buy button in muted ink.
- **Trust row:** one line under the hero button in muted ink. It reads: instant download, no subscription, 30-day money-back guarantee, built by a solo creator.
- **Email opt-in:** a card with a 48px input and a secondary-style submit button. The buy button stays the primary action.
- **FAQ:** an accordion of questions with 56px tall rows and hairline dividers. Place it before the footer.
- **Navigation:** single row, no mega menus. The logo sits on the left, followed by 3–4 text links and an outlined "$49 System" pill. On phones, show only Store, Blog and the pill.

## Layout
- Max width 1120px with 24px gutters and an 8px spacing scale (8, 16, 24, 32, 48, 64, 96).
- Section padding is 96px on desktop and 64px on mobile.
- Reading pages (blog) stay at a 720px column.
- Design mobile-first. Every page works at 375px wide with no sideways scroll.
- Sections run in this order:
  1. Hero (outcome headline, pain-point subhead, one button)
  2. Trust row
  3. Problem
  4. Outcome
  5. Product
  6. FAQ
  7. Guarantee
  8. Final button
- Grids are two columns at most. Animations are subtle and turn off when the visitor has asked their device for reduced motion.

## Do not use
- Countdown timers, "only 3 left," or any fake scarcity or fake urgency
- Hype words such as "insane," "game-changing," "secret," "explode" or "money printer" in public copy
- Income or results promises such as "make $10k/month"
- Invented testimonials, customer counts, star ratings, logos or "as seen in" badges
- Stock photos of smiling people at laptops
- Pop-ups on entry, exit-intent pop-ups or autoplay video
- Carousels and sliders
- Emoji as decoration
- Dark backgrounds, purple or teal gradients, glows and drop shadows
- More than one yellow button on a screen
- Three-column feature grids and numbered 01/02/03 eyebrows
- Social media feeds and widgets
- Third-party tracking pixels without the owner's approval
- Any section with no path to the buy button or the opt-in

## Copy rules
- The coach is the hero. Write to "you" about their problem. When the creator speaks, use "I," never "we."
- Put the benefit before the feature. "Stop losing clients to forgotten follow-ups" beats "5 email templates."
- Be specific. "Two hours becomes twenty minutes" beats "saves time."
- Use one idea per sentence. Keep sentences short, with no semicolons and no jargon.
- Name the guarantee next to every price: 30-day money-back guarantee.
- Use one call-to-action label per product, and use it the same way everywhere.
- Make no income promises and no fake urgency. Say "when you're ready," never "act now."
- Use placeholders only for testimonials, clearly marked, until real ones exist.
