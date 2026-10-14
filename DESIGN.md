# DESIGN.md

The design system for the Buzzyfly storefront. The tokens live in `src/styles/global.css`.

## Theme
Editorial and restrained. Type leads, the ground is dark, and one yellow button tells you what to do next.

## Palette (roles, not moods)
| Role | Hex | Token |
| --- | --- | --- |
| Background | #0B0B0D | `--bg` |
| Surface | #141418 | `--surface` (raised: `--surface-raised` #1C1C22) |
| Ink | #F3F3F5 | `--ink` / `--ink-rgb` |
| Muted ink | #A8A8B2 | `--muted` |
| Accent | #F5BE14 | `--accent` (text on it: `--on-accent` #0B0B0D) |
| Hairline | Ink at 8% | `--line` (stronger edge: `--line-strong`, 20%) |

Use the accent for one action per screen, never for decoration. Links are ink with an underline. Badges, eyebrows, check marks and focus rings are ink or muted, never accent.

The old token names (`--black`, `--gray`, `--gray-light`, `--gray-dark`) still work. They map onto the new roles so older pages keep rendering.

## Type
Display: Bricolage Grotesque, weights 700 and 800, tracking -0.02em (`--font-display`)
Body: Instrument Sans, 400 and 600 (`--font-body`)
Both are self-hosted as woff2 in `public/fonts/` (SIL Open Font License). No font CDN.
Never use Inter, Roboto, Arial or system defaults.

## Components
Buttons: pill, 44px tall, one primary per screen. Use `.btn-primary` (accent) for the one action and `.btn-secondary` (outline) for everything else.
Cards: 16px radius, 1px border at 8% ink, no drop shadow. The recommended product gets a 20% edge and a raised surface instead of a glow.
Navigation: single row, no mega menus. On phones the row drops to Store, Blog and the $49 pill.

## Layout
Max width 1180px, 24px gutters, 8px spacing scale (`--space-1` to `--space-8`). Long-form reading stays at 720px.

## Do not use
Purple gradients, teal accents, blinking status dots, three-column feature grids, numbered 01/02/03 eyebrows, stock photos, invented testimonials or logos.

## Copy rules
First person. Short sentences. No hype words.

## Exceptions
- The admin console (`AdminLayout.astro`) keeps a light working theme. It redefines the tokens on its own `body`.
- The kids pages use `.theme-light`, a warm light palette of their own.
- `/videos` and `/app` keep their own dark shells.
