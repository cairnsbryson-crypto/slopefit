# SlopeFit

A ski and snowboard gear-matching quiz. Seven questions in, a full colour-matched
kit out — board or skis, jacket, pants, goggles, helmet, gloves — scored against a
hand-verified catalog.

- **Live:** https://www.slopefit.co (Vercel, builds from `main`)
- **Repo:** `cairnsbryson-crypto/slopefit`
- **Owner:** Bryson — he rides, and he is the authority on anything about how gear
  actually behaves. When his experience contradicts the code, the code is usually
  wrong. That has happened and been proved at least twice.

## Stack

React 18 + Vite 5 + Tailwind, Supabase for magic-link auth. **The entire app is
`src/App.jsx`** — around 2,800 lines, catalog included. There is no router.

## Two things about the architecture that are easy to get wrong

**The app is a single URL.** About, Premium and the legal page are *phases* that
swap the screen without changing the address bar. Fine for an app.

**So guides are NOT phases.** They live as standalone HTML in `public/guides/`,
each with its own `<title>`, meta description, canonical and Article JSON-LD. A
guide added as a phase would have no URL, no title of its own and nothing for a
search engine to index — which is the entire reason for writing one. Adding a
guide means: a new file in `public/guides/`, a `<url>` block in
`public/sitemap.xml`, and a card on `public/guides/index.html`.

## The catalog

Roughly 234 products, ~47 brands, all in `src/App.jsx`. Every entry is verified
against the brand's own live data before it goes in. `.claude/agents/catalog-auditor.md`
holds the full verification method — **read it before touching catalog data.**

Things that have actually shipped wrong here, so check for them:

- Products the named brand does not make
- A board discontinued six years earlier, listed as current
- A brand reselling AliExpress goods under the supplier's own photos (RUFE, removed)
- Two brands selling the identical blank under different logos (Briqed vs Solo,
  removed) — each shot its own photography, so a byte-comparison finds nothing
- **CAD and AUD sticker prices entered as USD**, leaving 21 items 20–24% overpriced.
  Read `https://<domain>/meta.json` for currency and prefer
  `products/<handle>.json?country=US` over converting yourself. A store's declared
  currency can also be wrong — `hestragloves.us` reports SEK while listing a $90 mitt as `90`.
- **Never scrape a price out of page HTML by pattern matching.** It read $360 for
  an $1,150 Fischer ski. Structured source, or report "could not verify".
- **One photo can cover several colourways.** Ninety Roll leads both its dark green
  and red product pages with the same red pant, so first-match-wins on a filename
  picks the wrong colour.
- **A product can be named for its trim.** GSOU's "Magenta Contrast Stitch" pants
  are black; the SKU `upt2650-blk-3` says so.

Colour tags must match the measured photograph, not the colourway name. Measure in
CIE Lab, drop near-white background pixels, then **look at the image** — model shots
and coloured backdrops score badly while the garment is fine.

## Guides must agree with the app

Each sizing guide is built from the same function the quiz uses, so the two cannot
drift. If you change a formula, the guide changes too.

| Guide | Source of truth |
|---|---|
| `/guides/snowboard-length` | `recommendBoardLength()` — weight-led, `128 + kg × 0.4` |
| `/guides/ski-length` | `recommendSkiLength()` — height-led |

Ski ability adjustments land a groomed skier at chin (beginner), mouth
(intermediate), forehead (advanced), **their own height** (expert). Bryson supplied
that rule after the original values put everyone at chin height or below.

## Workflow

Branch is `claude/documents-slopefit-43hb00`. PRs get **squash-merged**, which
leaves the branch diverged from `main` every time. The fix, every time:

```
git fetch origin main -q
git checkout -q -B <branch> origin/main
git cherry-pick <your-sha>
git push --force-with-lease
```

Verify changes against the **live site**, not just the build — fetch the deployed
bundle and grep it. A merged PR is not a deployed PR.

## Traps that have cost real time

- **`vercel.json` is strict-schema validated.** A `"//"` comment key fails the whole
  deployment, silently serving the previous build. JSON has no comments.
- **`cleanUrls: true` strips `.html` site-wide**, which broke Google's site-verification
  file. `/guides` gets clean URLs from an explicit rewrite instead.
- **Fonts must be requested from `index.html`.** An `@import` inside a React-rendered
  `<style>` is only discovered after the bundle executes. Heading font is the Tailwind
  `display` family, whose chain ends in `sans-serif` so it never falls back to a serif.
- **The browser in this container cannot reach the public internet.** Serve `dist/`
  locally and point Playwright at localhost. A build needs dummy Supabase env vars
  or React throws before rendering.

## Where things stand

**Affiliate: nothing is earning.** Skimlinks rejected the site as unsuitable on
21 Aug, AvantLink called it thin earlier. Both were looking at a quiz plus a product
list with nothing to read. Guides are the fix; get three or four up before reapplying.

**198 of 234 Shop buttons** point at the brand's own product page. The rest fall back
to a Google Shopping search — Atomic and Armada 403 every request, Salomon and Line
are client-rendered, Scott returns 200 for slugs that do not exist.

Known gaps: yellow pants gone entirely and lime/mint down to two options each after
686 was removed; no black value-tier classic glove since `gl1` went; 24 prices across
Fischer, Giro, K2, Völkl and others still unverified.
