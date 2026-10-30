# Working on rackebrandt.pe

Read README.md first. The short version for coding agents:

- `build.py` writes every page. Change `data/*.json`, `content/**/*.md`, `src/figures/*`, `assets/*`, then run `python3 build.py` and commit what it writes. Never edit or replace `index.html`, `papers/**/index.html` or `notes/**/index.html` by hand: the next build overwrites them.
- Every page has a strict Content Security Policy: no inline `<script>`, no `onclick` style handlers, no `style="..."` attributes, no CDN scripts, styles or fonts. Plotly, KaTeX auto render and similar CDN setups will not run. Math is rendered at build time by `build.py`; interactive figures are plain JavaScript in `assets/` with markup in `src/figures/`.
- Lecture notes: one entry in `data/notes.json` plus `content/notes/<slug>.md`. See the Lecture notes section of README.md.
- Writing style on the site: plain, short sentences, no hyphens.
- Test locally before pushing: `python3 -m http.server` in the repo root, open the page, check the browser console is clean.
