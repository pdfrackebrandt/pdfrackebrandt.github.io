# rackebrandt.pe

Personal site. Static, no build step, no dependencies.

- `index.html` is the deployed page. Everything (CSS, JS, favicon) is inline except `portrait.jpg`.
- `body.html` is the same page in Claude Artifact format (no `<html>`/`<head>`/`<body>` wrapper).
- `build.py` regenerates `index.html` from `body.html`. Edit `body.html`, run `python3 build.py`, commit both.
- `CNAME` binds the GitHub Pages site to the apex domain.
- `.nojekyll` stops GitHub running the files through Jekyll.

The live research section is one work in progress: a slow passage through a Hopf bifurcation as a model of Polybius's regime cycle. The figure on the page integrates the normal form live.
