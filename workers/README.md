# Buzzyfly Workers

Named Cloudflare Workers that run the revenue machine. Each one owns one job. No overlap.

## 1. buzzyfly-deploy
Keeps the live site in sync with GitHub main. Builds the Astro site and deploys to Cloudflare Pages/Workers. Runs on every push to main and on a schedule as a safety net.

## 2. buzzyfly-download
Serves the $49 digital system zip. Rate-limited, logged, signed URLs. This is the money endpoint.

## 3. buzzyfly-analytics
Logs every download, page view, and opt-in to D1. Powers the daily revenue report.

## 4. buzzyfly-content
Generates and publishes new pain-first blog posts and product files on a schedule so the site never goes stale.

## 5. buzzyfly-traffic
Finds and posts the free checklist and blog content to places where buyers actually hang out. Drives the eyeballs that turn into $49 sales.

Deploy order: analytics first, then download, then deploy, then content, then traffic.
