#!/usr/bin/env python3
"""Picture of one figure widget for the Rikuy export: python3 tools/figshots.py widget.html out.png
The controls and caption are hidden (the LaTeX caption says what the figure shows); needs Python Playwright."""
import sys
from playwright.sync_api import sync_playwright

src, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 760, 'height': 900}, device_scale_factor=2, color_scheme='light')
    page.goto('file://' + src)
    page.add_style_tag(content='figcaption,button,input,select,.fig-controls,div[role="group"],label:has(input),label:has(select){display:none!important}')
    page.wait_for_timeout(700)
    page.locator('.rikuy-widget figure').first.screenshot(path=out)
    browser.close()
