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

- `index.html`, `papers/*/index.html`, `sitemap.xml`, `llms.txt`, `llms-full.txt`: generated, do not edit by hand.
- `assets/site.css`, `assets/site.js`: styles, figures, tabs, paper filters.
- `assets/fonts/`: self hosted Inter and Instrument Serif (SIL Open Font License).
- `src/figures/`, `src/icons/`: markup the build inlines.
- `robots.txt`: lets search engines and citing AI search tools in, asks AI training crawlers to stay out.
- `llms.txt`, `llms-full.txt`: plain text summaries for AI agents (the llmstxt.org convention), built from the same data. Every page links to `llms.txt`, and paper pages carry ScholarlyArticle structured data.

## Security notes

- Every page carries a Content Security Policy: scripts only from this site and GoatCounter, no inline scripts.
- The email address never appears in the HTML, the data files or the agent files. `assets/site.js` stores it shifted by one character code and decodes it only inside the click handler, so even the rendered page never carries it until someone clicks.
- Only publish PDFs you are happy to see copied. Without a `pdf` link, a paper page offers "Draft on request".

`body.html` is the old Artifact copy of the page and is no longer used.
