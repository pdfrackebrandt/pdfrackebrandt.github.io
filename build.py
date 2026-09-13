#!/usr/bin/env python3
"""Wrap body.html (the Artifact-format source) into a standalone index.html."""
src = open('body.html', encoding='utf-8').read()
he = src.index('<style>')
title_block, rest = src[:he], src[he:]
se = rest.index('</style>') + len('</style>')
style_block, body_block = rest[:se], rest[se:]
doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Pedro F. Rackebrandt. Constitutional mechanism design, political economy and regime dynamics. Incoming MPhil Economics, Merton College, Oxford.">
<meta name="color-scheme" content="light dark">
<meta property="og:title" content="Pedro F. Rackebrandt">
<meta property="og:description" content="Constitutional mechanism design, political economy and regime dynamics.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://rackebrandt.pe/">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="https://rackebrandt.pe/">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%231F4E79'/%3E%3Crect x='5' y='19' width='4' height='7' fill='%23D8C79B'/%3E%3Crect x='11' y='13' width='4' height='13' fill='%23E9EBEC'/%3E%3Crect x='17' y='17' width='4' height='9' fill='%236E8EA0'/%3E%3Crect x='23' y='8' width='4' height='18' fill='%23E9EBEC'/%3E%3C/svg%3E">
{title_block.strip()}
<style>
html,body{{margin:0}}
img{{max-width:100%}}
[hidden]{{display:none!important}}
</style>
{style_block}
</head>
<body>
{body_block}
</body>
</html>
"""
open('index.html', 'w', encoding='utf-8').write(doc)
print("index.html", len(doc), "bytes")
