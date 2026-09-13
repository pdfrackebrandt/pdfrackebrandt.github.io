# rackebrandt.pe

Personal site. Static, no build step, no dependencies.

- `index.html` is the deployed page. Everything (CSS, JS, favicon) is inline.
- `body.html` is the same page in Claude Artifact format (no `<html>`/`<head>`/`<body>` wrapper).
- `build.py` regenerates `index.html` from `body.html`. Edit `body.html`, run `python3 build.py`, commit both.
- `CNAME` binds the GitHub Pages site to the apex domain.
- `.nojekyll` stops GitHub running the files through Jekyll.

The hero canvas integrates a chain of diffusively coupled Stuart-Landau
oscillators (the normal form of a Hopf bifurcation), one per column, with the
control parameter rising left to right. Columns left of the threshold relax
back to the fixed point; columns right of it settle onto a limit cycle.
Pointer movement injects a Gaussian perturbation into the chain.
