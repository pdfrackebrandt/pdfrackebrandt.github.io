# Working on rackebrandt.pe

Read README.md first. The short version for coding agents:

- `build.py` writes every page. Change `data/*.json`, `content/**/*.md`, `src/figures/*`, `assets/*`, then run `python3 build.py` and commit what it writes. Never edit or replace `index.html`, `papers/**/index.html` or `notes/**/index.html` by hand: the next build overwrites them.
- Every page has a strict Content Security Policy: no inline `<script>`, no `onclick` style handlers, no `style="..."` attributes or `<style>` blocks, no CDN scripts, styles or fonts. Plotly, KaTeX auto render and similar setups will not run. Math is rendered at build time by `build.py`; interactive figures are plain JavaScript in `assets/` with markup in `src/figures/`.
- Lecture notes are private and encrypted. Never commit plain notes (`data/notes.json`, `content/notes/*.md`) or the password, and never add a password check in page code: the build seals the notes and `assets/site.js` opens them. To add or edit a note you need the password in `.notes-password` (git ignores it); see "Lecture notes (private)" in README.md.
- Writing style on the site: plain, short sentences, no hyphens.
- Test locally before pushing: `python3 -m http.server` in the repo root, open the page, check the browser console is clean.
