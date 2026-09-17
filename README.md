# rackebrandt.pe

Personal site. Static, no build step, no dependencies.

- `index.html` is the deployed page. Everything (CSS, JS, favicon) is inline except `portrait.jpg`.
- `body.html` is the same page in Claude Artifact format (no `<html>`/`<head>`/`<body>` wrapper).
- `build.py` regenerates `index.html` from `body.html`. Edit `body.html`, run `python3 build.py`, commit both.
- `CNAME` binds the GitHub Pages site to the apex domain.
- `.nojekyll` stops GitHub running the files through Jekyll.

Research currently has two pieces: the Polybius regime-cycle Hopf model, and a calibration of multiplicity corrections for technical trading rules (with Sebastian Winzker).
