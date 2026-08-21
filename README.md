# Astro Starter Kit:  Blog

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/astro-blog-starter-template)

![Astro Template Preview](https://github.com/withastro/astro/assets/2244813/ff10799f-a816-4703-b967-c78997e8323d)

<!-- dash-content-start -->

Create a blog with Astro and deploy it on Cloudflare Workers as a [static website](https://developers.cloudflare.com/workers/static-assets/).

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support
- ✅ Built-in Observability logging

<!-- dash-content-end -->

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/astro-blog-starter-template
```

A live public deployment of this template is available at [https://astro-blog-starter-template.templates.workers.dev](https://astro-blog-starter-template.templates.workers.dev)

## 🚀 Project Structure

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                           | Action                                           |
| :-------------------------------- | :----------------------------------------------- |
| `npm install`                     | Installs dependencies                            |
| `npm run dev`                     | Starts local dev server at `localhost:4321`      |
| `npm run build`                   | Build your production site to `./dist/`          |
| `npm run preview`                 | Preview your build locally, before deploying     |
| `npm run astro ...`               | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help`         | Get help using the Astro CLI                     |
| `npm run build && npm run deploy` | Deploy your production site to Cloudflare        |
| `npm wrangler tail`               | View real-time logs for all Workers              |

## 🔐 Admin console

A private admin console lives at `/admin`, protected by a username/password login. It covers:

- **Dashboard** — subscriber/order counts and recent activity.
- **Posts** — list posts; create, edit, and delete them (commits Markdown files straight to this repo via the GitHub API).
- **Media** — upload images, documents and short clips, browse them, copy a link to paste
  into a post, and delete them. Files are stored in the `MY_PRODUCTS` R2 bucket under a
  `public/` prefix and served from `/media/<name>`.
- **Subscribers** — search, remove, and CSV-export the newsletter list.
- **Orders** — search fulfilled orders and reissue a customer's download link. Re-issued
  links are random tokens stored in `download_tokens` (valid 3 days, revocable by deleting
  the row), so this works without `DOWNLOAD_TOKEN_SECRET` being set.
- **Settings** — edit Buzzyfly branding/copy (mirrors `src/data/monetization.ts`).
- **Activity log** — every login and admin change, audited in D1.

### Setup

1. Apply the D1 migrations. The console reads the `subscribers`, `fulfillments`, and
   `download_tokens` tables the site already uses, reuses the existing `site_content`
   key/value table for editable settings, and adds only `admin_audit_log` of its own
   (`migrations/0003_admin_console.sql`):
   ```bash
   for f in migrations/*.sql; do
     wrangler d1 execute buzzy-fly_db --file="$f" --local    # for `wrangler dev`
     wrangler d1 execute buzzy-fly_db --file="$f" --remote   # for production
   done
   ```
   Every migration is `CREATE TABLE IF NOT EXISTS`, so re-running them against a
   database that already has the tables is a no-op.
2. Set the login secrets (copy `.dev.vars.example` to `.dev.vars` for local dev, or `wrangler secret put <NAME>` in production):
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD` — the credentials you'll sign in with.
   - `ADMIN_SESSION_SECRET` — a long random string used to sign the login session cookie.
3. *(Optional)* To let Posts/Settings publish changes instead of running read-only, set `GITHUB_TOKEN` (a fine-grained PAT with **Contents: Read and write** on this repo), `GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_BRANCH`. Every save commits directly to that branch and triggers a normal redeploy — there's no draft/review step, so treat the admin password as production-sensitive.

Without the GitHub token set, the console still runs — Posts becomes a read-only list and Settings only records changes in D1 — everything else (auth, subscribers, orders, activity log) works regardless.

> **Note:** `site_content` is shared with other tooling, so the console reads and writes
> only the setting keys it owns and leaves any other rows in that table untouched.

### Media storage and the paid-product boundary

The `MY_PRODUCTS` bucket holds two kinds of object and they must not mix:

| Prefix      | Contents                       | Served by                                  |
| ----------- | ------------------------------ | ------------------------------------------ |
| `products/` | files customers **pay for**    | `/api/download`, only with a valid token    |
| `public/`   | site media, public to everyone | `/media/<name>`, no authentication          |

`/media/[...key].ts` is public and unauthenticated, so it is written so that reaching
`products/` is impossible rather than unlikely: `resolvePublicKey()` in `src/lib/media.ts`
is the only thing permitted to prepend the prefix, and it rejects any name containing a
path separator, `..`, a null byte, or an extension outside the allowlist. Multi-segment
requests are refused outright rather than normalised.

If you extend the media features, route every bucket access through that helper rather
than composing keys by hand.

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/). 
