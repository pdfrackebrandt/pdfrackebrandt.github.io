# rackebrandt.pe

Personal site, served by GitHub Pages. Static HTML, no frameworks, no third party code except GoatCounter.

## Add or edit a paper

1. Edit `data/papers.json` (one entry per paper; copy an existing one).
2. Run `python3 build.py` (standard library only).
3. Commit everything, including the regenerated `index.html`, `papers/` and `sitemap.xml`.

Fields: `slug` (the URL, /papers/slug/), `title`, `year`, `status`, `topic` (one word, becomes a filter chip),
`tags`, `coauthors` (name and optional url), `featured` (true shows a full card with figure at the top),
`figure` (name of a file in `src/figures/`, optional), `summary` (one line for the list), `text` (paragraphs),
`figure_help` (optional), `links` (`pdf`, `arxiv`, `code`, `data`, all optional).

Bio, socials and tools live in `data/site.json`.

## Layout

- `index.html`, `papers/*/index.html`, `sitemap.xml`: generated, do not edit by hand.
- `assets/site.css`, `assets/site.js`: styles, figures, tabs, paper filters.
- `assets/fonts/`: self hosted Inter and Instrument Serif (SIL Open Font License).
- `src/figures/`, `src/icons/`: markup the build inlines.
- `robots.txt`: lets search engines in, asks AI training crawlers to stay out.

## Security notes

- Every page carries a Content Security Policy: scripts only from this site and GoatCounter, no inline scripts.
- The email address never appears in the HTML; `site.js` assembles it in the browser.
- Only publish PDFs you are happy to see copied. Without a `pdf` link, a paper page offers "Draft on request".

`body.html` is the old Artifact copy of the page and is no longer used.
