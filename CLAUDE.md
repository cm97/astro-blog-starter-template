# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                        # install dependencies
npm run dev                        # start local dev server at localhost:4321
npm run build                      # build production site to ./dist/ (runs astro build)
npm run preview                    # build, then run wrangler dev against the build (local Worker preview)
npm run check                      # astro build && tsc && wrangler deploy --dry-run — full pre-deploy validation
npm run deploy                     # wrangler deploy — deploy to Cloudflare Workers
npm run astro -- --help            # Astro CLI help; `npm run astro check` type-checks .astro files
npm run cf-typegen                 # regenerate worker-configuration.d.ts from wrangler.json bindings
```

There is no test suite and no linter configured in this repo. `npm run check` (build + `tsc` + dry-run deploy) is the closest thing to a full validation pass and is worth running after non-trivial changes.

## Architecture

This is an Astro blog deployed as a Cloudflare Worker (not Cloudflare Pages) via `@astrojs/cloudflare`, using static assets output — see `astro.config.mjs` and `wrangler.json`. The Worker entrypoint is the built `./dist/_worker.js/index.js`; `wrangler.json` also declares a `SESSION` KV binding for Cloudflare KV-backed sessions.

**Routing**: file-based under `src/pages/`. Notable routes:
- `src/pages/index.astro` — homepage
- `src/pages/blog/index.astro` — blog listing, built from the `blog` content collection
- `src/pages/blog/[...slug].astro` — individual post pages, statically generated via `getStaticPaths()` over the `blog` collection, rendered through `src/layouts/BlogPost.astro`
- `src/pages/rss.xml.js` — RSS feed generated with `@astrojs/rss` from the same collection
- `src/pages/about.astro` — reuses `BlogPost.astro` as a generic content layout, not just for posts

**Content collections**: blog posts live in `src/content/blog/` as `.md`/`.mdx` files, loaded via `glob()` and validated against a Zod schema defined in `src/content.config.ts` (`title`, `description`, `pubDate`, `updatedDate?`, `heroImage?`). Adding a post is just dropping a new file in that directory with matching frontmatter — no registration elsewhere needed.

**Shared UI**: `src/components/` holds `BaseHead.astro` (meta/SEO/OpenGraph/Twitter tags, imports `src/styles/global.css`), `Header.astro`/`HeaderLink.astro` (nav with active-link detection based on `Astro.url.pathname`), `Footer.astro`, and `FormattedDate.astro`. `src/consts.ts` holds site-wide `SITE_TITLE`/`SITE_DESCRIPTION` used across pages — change site branding there.

**Layouts**: `src/layouts/BlogPost.astro` is the shared full-page shell (head + header + article + footer) used by both actual blog posts and `about.astro`.

Global CSS custom properties (colors, spacing) live in `src/styles/global.css`, imported once via `BaseHead.astro` so it's present on every page.

`worker-configuration.d.ts` is generated output (`npm run cf-typegen`) — don't hand-edit it.
