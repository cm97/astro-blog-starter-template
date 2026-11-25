# Design

Kept by the Design Lead. The other designers and the build team follow it.
These are the tokens and specs as they actually ship in `src/styles/global.css`
and the shared components. If the code and this file disagree, fix the code to
match or update this file in the same PR — never let them drift.

## Brand
- Primary blue: `--accent` `#2337ff`, `--accent-dark` `#000d8a`. White cards on
  light; white text on blue CTAs. (The brand wordmark may use a #2a3bff→#0b148f
  gradient; the UI token is the flat `#2337ff` above.)
- Accent orange (logo wings): `#ffd166` → `#ff7a18`. Use sparingly for highlights.
- Text tokens (RGB triplets): `--black` `15, 18, 25` (near-black `#0f1219`),
  `--gray` `96, 115, 159`, `--gray-dark` `34, 41, 57`, `--gray-light` `229, 233, 240`.
- Font: **Atkinson** (self-hosted, `/fonts/atkinson-*.woff`, `font-display: swap`).
  No new font families — Atkinson is the one typeface. Big, confident headlines;
  calm body text.
- Logo: `public/buzzyfly-logo.svg`. Keep clear space around it.

## Rules
- Respect the CSS variables in the global styles; add new tokens there, not inline.
- Mobile first. Everything must work at 375px with no sideways scrolling.
- Tap targets at least 44px. Visible focus rings (3px `--accent` outline, already
  global). Enough contrast (WCAG AA).
- Buy button always easy to find: price, what you get, refund line, button.
- Subtle motion only, and respect `prefers-reduced-motion` (global reset in place).

## Type scale
- Body: 20px / line-height 1.7 desktop, 18px at ≤720px.
- Default heading scale (global, used where a page sets nothing of its own):
  h1 3.052em, h2 2.441em, h3 1.953em, h4 1.563em (1.25 modular ratio),
  line-height 1.2, `color: --black`.
- **Long-form content (`.prose`, blog + articles):** section headings are fluid
  and have clear space above so each reads as the start of a new section and
  sits a step below the page title:
  - `.prose h2` `clamp(1.7rem, 1.25rem + 2vw, 2.1rem)`, `margin-top: 2.2em`
  - `.prose h3` `clamp(1.35rem, 1.1rem + 1.1vw, 1.6rem)`, `margin-top: 2.2em`
  - `.prose h4` `clamp(1.15rem, 1rem + 0.6vw, 1.3rem)`, `margin-top: 2.2em`
  - first child of `.prose` has `margin-top: 0`.
  Rhythm rule: more space above a heading than below it, so the heading groups
  with the section it introduces. (Shipped 2026-11-02.)
- `/` and `/store` set their own hero/section heading sizes (scoped `clamp()` in
  those files) and are **not** affected by the global or `.prose` scale. Those
  pages belong to the Home & Store designer.

## Links
- Every link has a real hover state: `a:hover` darkens to `--accent-dark`
  (`#000d8a`). Header and footer links set their own hover and are unchanged;
  pill CTAs keep white text. (Fixed 2026-11-16 — the old `a:hover` repeated the
  resting color, so no link gave hover feedback.)
- **Inline links in article running text** (`.prose > p/ul/ol/blockquote a`) are
  underlined, so a link is never signalled by color alone (WCAG 1.4.1), and the
  underline thickens to 2px on hover/focus. Scoped to markdown block children,
  so buttons and cards that also sit inside `.prose` (the product callout, the
  related-reads list, the prev/next nav) keep their own styling. (Shipped 2026-11-16.)

## CTA / buttons (current, for reference)
- Primary CTA on `/` and `/store`: pill (`border-radius: 999px`), `--accent`
  background, white text, `font-weight: 800`, `min-height: 72px` (56px on small
  phones), generous padding. Keep this shape when adding new primary CTAs.
- There is no global `.btn` for public pages yet; each page/component styles its
  own CTA to the spec above. A shared button token set is a future item (see
  BACKLOG / below) — until then, match the pill spec by hand.

## Specs for the other designers
The Design Lead adds page and component specs here.
- **Backlog for the Design Lead (next runs):** extract the repeated primary-CTA
  pill into one shared `.btn-primary` token/class in global styles so `/`,
  `/store` and components stop duplicating it; audit heading contrast of
  `--gray` on white (AA for large text only).

Reviews:
- 2026-11-02 (Design Lead): reconciled DESIGN.md to the real shipped tokens
  (Atkinson font, `#2337ff` accent) and added the `.prose` type-rhythm spec with
  the shipped change.
- 2026-11-16 (Design Lead): fixed the site-wide `a:hover` no-op and gave inline
  article links an underline affordance (see "Links"). Shared `.btn-primary`
  token still open for a future run.
