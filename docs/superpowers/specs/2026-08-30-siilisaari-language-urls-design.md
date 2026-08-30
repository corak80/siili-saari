# Real /sv/ and /en/ URLs with hreflang — design

Date: 2026-08-30
Status: approved in chat, not yet implemented
Repo: `corak80/siili-saari` → siilisaari.fi (GitHub Pages, Cloudflare in front)

## Problem

siilisaari.fi is trilingual, but every language lives on one URL and is
selected in the browser. A URL carries one `<html lang>`, one `<title>`, one
`<meta name="description">` and one canonical, so Google has exactly one
Finnish version of each page to rank. In a bilingual city that makes the site
invisible to Swedish-language search.

The site uses **two different i18n mechanisms**, and the fix differs for each:

| Page | Mechanism | What Google receives today |
|---|---|---|
| `index.html`, `tietosuoja.html` | `data-i18n` keys filled from `i18n.js` | Finnish only; SV/EN injected by JS |
| `siilinhoito.html`, `siilin-pesa.html`, `vapaaehtoiseksi.html`, pipeline pages | inline `data-lang` spans | all three languages present in the HTML, SV/EN hidden with `display:none` |

So on the guide pages the Swedish text *is* served — it is the per-language
page signals that are missing everywhere. That is what this design adds.

## Goals

- Three indexable, separately rankable versions of the three pages with real
  search demand.
- Correct, reciprocal hreflang so Google treats them as one cluster rather
  than duplicates.
- No change to how Finnish content is authored.

## Non-goals

- Translating slugs. Filenames stay identical across languages (see Decisions).
- Converting `vapaaehtoiseksi.html`, `tietosuoja.html` or the four volunteer
  pipeline pages.
- Any change to GitHub Pages deployment plumbing.
- Automatic language redirection.

## Scope — 9 URLs

```
/                        /sv/                    /en/
/siilinhoito.html        /sv/siilinhoito.html    /en/siilinhoito.html
/siilin-pesa.html        /sv/siilin-pesa.html    /en/siilin-pesa.html
```

Finnish stays at the root: it keeps its indexed URLs and Search Console
history, and GitHub Pages cannot issue server redirects, so relocating it
would require meta-refresh hacks.

## Head signals

Each generated page carries, for its own language:

- `<html lang="fi|sv|en">`
- `<title>` and `<meta name="description">`
- self-referencing `<link rel="canonical">`
- the guides' seven `og:` tags, translated (`index.html` has none today and
  gains none here)
- the full hreflang set, identical on all three versions of a page, including
  the self-reference:

```html
<link rel="alternate" hreflang="fi" href="https://siilisaari.fi/siilinhoito.html">
<link rel="alternate" hreflang="sv" href="https://siilisaari.fi/sv/siilinhoito.html">
<link rel="alternate" hreflang="en" href="https://siilisaari.fi/en/siilinhoito.html">
<link rel="alternate" hreflang="x-default" href="https://siilisaari.fi/siilinhoito.html">
```

Google discards hreflang sets that are not reciprocal, so all four links must
appear on all three versions.

### JSON-LD

`index.html` carries one NGO + AnimalShelter block. The `/sv/` and `/en/`
copies keep the **same `@id`** (`https://siilisaari.fi/#organization`) and gain
`inLanguage`, with `description` translated. One organisation described three
times, not three organisations.

## Source of truth and generator

The Finnish files remain hand-edited and authoritative. `/sv/` and `/en/` are
derived artefacts and are never edited directly.

`build.js` (Node) reads:

- `index.html` + `i18n.js` — substitutes `data-i18n` keys for the target
  language; per-language `meta.title` / `meta.description` already exist in the
  dictionary
- `siilinhoito.html`, `siilin-pesa.html` — keeps the target language's
  `data-lang` elements and removes the other two
- `seo.json` — per-language title, description and OG strings for the two
  guides

and writes `sv/` and `en/`, three pages each.

### Why a parser, not regex

`data-lang` appears on `div`, `ul` and `table` elements as well as spans — 153
such elements on `siilinhoito.html`, 123 on `siilin-pesa.html`. Removing
balanced blocks is not something regex does safely. `build.js` therefore uses
`node-html-parser` as a **devDependency**, with `node_modules` gitignored. The
published site remains dependency-free.

### seo.json

```json
{
  "siilinhoito.html": {
    "sv": { "title": "…", "description": "…", "og:title": "…", "og:description": "…" },
    "en": { "title": "…", "description": "…", "og:title": "…", "og:description": "…" }
  },
  "siilin-pesa.html": { "sv": { … }, "en": { … } }
}
```

These four titles and four descriptions **do not exist yet** — each guide has a
single Finnish title and description. They are copywriting, not plumbing, and
they largely determine whether the pages rank. They must be drafted in FI/SV/EN
and approved before the build is run.

### Two transforms that are easy to miss

- **Internal links are rewritten.** A link to `siilinhoito.html` on a `/sv/`
  page must become `/sv/siilinhoito.html`, or Swedish readers are bounced back
  into Finnish and the cluster leaks.
- **Asset paths must be root-absolute.** `fonts/`, images and `i18n.js`
  referenced from `/sv/` need a leading `/` or they 404 one directory down.

## Build output and CI

Generated pages are **committed to `main`**: Pages serves from the branch, and
the deployment plumbing is deliberately left alone.

A GitHub Action re-runs `build.js` on push and **fails if the result differs
from what is committed**, so a forgotten build is caught loudly instead of
silently going stale.

## Language switcher

On the converted pages the switcher becomes three anchors to the equivalent
URL, still writing `ss-lang` to localStorage on click so the unconverted
pipeline pages keep honouring the preference. Both mechanisms coexist until
those pages are converted, if they ever are.

**No automatic redirection on browser language.** Googlebot crawls from the US;
auto-redirect would show it the English page and poison the cluster.

## Verification

1. All 9 URLs return 200.
2. Each carries the correct `lang`, title, description and self-referencing
   canonical.
3. hreflang sets are reciprocal across all three versions of each page.
4. Internal links resolve within their own language.
5. Assets load on `/sv/` and `/en/` (no 404s one level down).
6. `sitemap.xml` lists all 9 URLs; hreflang stays in the HTML only, so there is
   one source of truth for it.
7. Indexing requested in Search Console for the six new URLs.
8. `robots.txt` gains `Disallow: /docs/` so this spec directory is not crawled.

## Decisions

- **Identical filenames across languages.** `/sv/siilinhoito.html` reads oddly
  to a Swedish speaker, but it makes the switcher a prefix swap and keeps the
  generator dumb. Slug keywords are weak next to title, H1 and body content.
  Revisit only if the URLs prove genuinely confusing.
- **Committed output over build-and-deploy Action.** Lower risk than changing
  the Pages source on a domain whose certificate provisioning has misbehaved
  before.

## Risks

- Forgetting to run the build — mitigated by the CI check.
- The four titles and descriptions are the highest-value and most
  easily-rushed part of the work.
- Two i18n mechanisms coexist afterwards. Acceptable, but it is the thing that
  will confuse whoever touches this next.
