# Astro on Cloudflare Workers

A minimal [Astro](https://astro.build) project set up to deploy on [Cloudflare Workers](https://developers.cloudflare.com/workers/).

## Getting Started

```bash
npm install
npm run dev
```

## Project Structure

Astro looks for `.astro`, `.md`, or `.mdx` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

## Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                          |
| :---------------------- | :----------------------------------------------- |
| `npm install`            | Installs dependencies                           |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site                      |
| `npm run deploy`          | Deploy to Cloudflare Workers                     |
| `npm run cf-typegen`      | Generate types for your Cloudflare bindings      |
