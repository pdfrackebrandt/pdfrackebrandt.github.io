#!/usr/bin/env python3
"""Build rackebrandt.pe from data/*.json.

Edit data/papers.json or data/site.json, run `python3 build.py`, commit everything.
Writes index.html, papers/<slug>/index.html, sitemap.xml, llms.txt, llms-full.txt and assets/math.css.
Paper explainers live in content/<slug>.md (Markdown with LaTeX math; see the notes above md_html).
Standard library only, except that new or changed math is rendered once with Node (cd tools && npm install).
"""
import gzip
import hashlib
import json
import os
import re
import subprocess
from datetime import date
from html import escape, unescape

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = json.load(open(os.path.join(ROOT, 'data', 'site.json'), encoding='utf-8'))
PAPERS = json.load(open(os.path.join(ROOT, 'data', 'papers.json'), encoding='utf-8'))
BASE = SITE['url'].rstrip('/')
VIEW = 'visual' if SITE.get('default_view') == 'visual' else 'list'   # how Research opens: 'list' or 'visual'
YEAR = date.today().year

ICONS = {n: open(os.path.join(ROOT, 'src', 'icons', n + '.svg'), encoding='utf-8').read().strip()
         for n in ('email', 'github', 'linkedin', 'x')}

# Scripts only from this site and GoatCounter; no inline script anywhere.
CSP = ("default-src 'self'; script-src 'self' https://gc.zgo.at; style-src 'self'; "
       "img-src 'self' data: https://pedrofrackebrandt.goatcounter.com; "
       "connect-src https://pedrofrackebrandt.goatcounter.com; font-src 'self'; "
       "object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests")


def figure(name):
    return open(os.path.join(ROOT, 'src', 'figures', name + '.html'), encoding='utf-8').read().strip()


def indent(block, n):
    pad = ' ' * n
    return '\n'.join(pad + line if line else line for line in block.split('\n'))


def url_of(p):
    return '/papers/%s/' % p['slug']


def plain(html):
    """Markup to plain text for llms.txt: drop tags, decode entities."""
    return unescape(re.sub(r'<[^>]+>', '', html)).strip()


def bio_for_agents(par):
    # the consultancy line is an email link; agents get a pointer, never the address
    if 'js-email' in par:
        return 'Open to AI and superintelligence consultancy: use the email link on %s/ (the address appears only when clicked).' % BASE
    return plain(par)


def author_list(p):
    return [SITE['name']] + [c['name'] for c in p.get('coauthors', [])]


def byline(p):
    cs = p.get('coauthors', [])
    if not cs:
        return ''
    names = ['<a href="%s" rel="noopener noreferrer">%s</a>' % (escape(c['url']), escape(c['name'])) if c.get('url')
             else escape(c['name']) for c in cs]
    return 'with ' + ', '.join(names[:-1]) + (' and ' if len(names) > 1 else '') + names[-1]


def last_first(name):
    parts = name.split()
    return '%s, %s' % (parts[-1], ' '.join(parts[:-1]))


def bibtex(p):
    first = re.sub(r'[^a-z]', '', p['title'].split()[0].lower()) or 'paper'
    key = 'rackebrandt%s%s' % (p['year'], first)
    authors = ' and '.join(last_first(a) for a in author_list(p))
    return ('@unpublished{%s,\n  title  = {%s},\n  author = {%s},\n  year   = {%s},\n  note   = {%s},\n  url    = {%s}\n}'
            % (key, p['title'], authors, p['year'], p['status'], BASE + url_of(p)))


def tags_html(p):
    out = ['<span class="tag live">%s</span>' % escape(p['status'])]
    out += ['<span class="tag">%s</span>' % escape(t) for t in p.get('tags', [])]
    return ''.join(out)


def help_html(p):
    if not p.get('figure_help'):
        return ''
    body = '\n'.join('    <p>%s</p>' % escape(x) for x in p['figure_help'])
    return ('<details class="more">\n  <summary>How to read the figure</summary>\n  <div class="more-body">\n%s\n  </div>\n</details>'
            % body)


# ---------------------------------------------------------------------------
# Paper explainers: content/<slug>.md, a small Markdown subset with LaTeX math.
#   ## Heading      paragraphs      - bullets      1. numbers      > result box
#   | table |       **bold**  *italic*  [link](url)  `code`        $inline$   $$display$$   \$ for a dollar sign
# Math is rendered to static HTML at build time (KaTeX), so pages need no script and keep the strict CSP.
# Rendered math is cached in data/math-cache.json.gz; Node and tools/node_modules are needed only for new math.

MATH_PATH = os.path.join(ROOT, 'data', 'math-cache.json.gz')
MATH_JOBS = []
UNSHIPPED = re.compile(r'\\(mathfrak|mathscr|mathsf|mathtt|texttt|textsf|frak|Bbb)\b')


def math_token(tex, display):
    tex = tex.strip()
    assert not UNSHIPPED.search(tex), 'font not shipped in assets/katex/fonts: %s' % tex
    MATH_JOBS.append((tex, display))
    return '\x00M%d\x00' % (len(MATH_JOBS) - 1)


def md_inline(s):
    keep = []

    def stash(html):
        keep.append(html)
        return '\x01%d\x01' % (len(keep) - 1)

    s = s.replace('\\$', stash('$'))
    s = re.sub(r'\$([^$\n]+?)\$', lambda m: stash(math_token(m.group(1), False)), s)
    s = re.sub(r'`([^`]+)`', lambda m: stash('<code>%s</code>' % escape(m.group(1))), s)
    s = escape(s, quote=False)
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: '<a href="%s"%s>%s</a>' % (
        m.group(2).replace('"', '%22'), '' if m.group(2).startswith(('/', '#')) else ' rel="noopener noreferrer"', m.group(1)), s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![*\w])\*(?![\s*])(.+?)(?<![\s*])\*(?![*\w])', r'<em>\1</em>', s)
    return re.sub('\x01(\\d+)\x01', lambda m: keep[int(m.group(1))], s)


def anchor(text):
    return re.sub(r'[^a-z0-9]+', '-', plain(text).lower()).strip('-')


def md_items(lines, marker):
    items = []
    for line in lines:
        m = marker.match(line)
        if m:
            items.append(line[m.end():])
        elif items:
            items[-1] += ' ' + line.strip()
    return ''.join('<li>%s</li>' % md_inline(i) for i in items)


def md_table(lines):
    rows = [[c.strip() for c in l.strip().strip('|').split('|')] for l in lines if not re.match(r'^\|?[\s:|-]+\|?$', l)]
    head_row, body = rows[0], rows[1:]
    th = ''.join('<th>%s</th>' % md_inline(c) for c in head_row)
    tb = ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % md_inline(c) for c in r) for r in body)
    return '<div class="table"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (th, tb)


def md_html(src):
    src = re.sub(r'\$\$(.+?)\$\$', lambda m: '\n\n$$%s$$\n\n' % m.group(1), src.replace('\r', ''), flags=re.S)
    out = []
    for block in re.split(r'\n\s*\n', src.strip()):
        lines = [l for l in block.split('\n') if l.strip()]
        if not lines:
            continue
        first = lines[0]
        if block.strip().startswith('$$'):
            out.append('<div class="eq">%s</div>' % math_token(block.strip()[2:-2], True))
        elif first.startswith('#'):
            level = min(len(first) - len(first.lstrip('#')), 3)
            text = first.lstrip('#').strip()
            tag = 'h2' if level <= 2 else 'h3'
            out.append('<%s id="%s">%s</%s>' % (tag, anchor(text), md_inline(text), tag))
            if lines[1:]:
                out.append(md_html('\n'.join(lines[1:])))
        elif first.startswith('- '):
            out.append('<ul>%s</ul>' % md_items(lines, re.compile(r'- ')))
        elif re.match(r'\d+\. ', first):
            out.append('<ol>%s</ol>' % md_items(lines, re.compile(r'\d+\. ')))
        elif first.startswith('>'):
            out.append('<div class="result">%s</div>' % md_html('\n'.join(re.sub(r'^>\s?', '', l) for l in lines)))
        elif first.startswith('|'):
            out.append(md_table(lines))
        else:
            out.append('<p>%s</p>' % md_inline(' '.join(l.strip() for l in lines)))
    return '\n'.join(out)


def explainer(p):
    f = os.path.join(ROOT, 'content', p['slug'] + '.md')
    return open(f, encoding='utf-8').read() if os.path.exists(f) else ''


def resolve_math(pages):
    """Swap math tokens for KaTeX HTML. Inline styles become classes in assets/math.css (the CSP blocks style attributes)."""
    disk = json.loads(gzip.decompress(open(MATH_PATH, 'rb').read())) if os.path.exists(MATH_PATH) else {}
    cache = dict(disk)
    keys = [('D ' if d else 'I ') + t for t, d in MATH_JOBS]
    missing = sorted(set(k for k in keys if k not in cache))
    if missing:
        tool = os.path.join(ROOT, 'tools', 'tex.mjs')
        if not os.path.isdir(os.path.join(ROOT, 'tools', 'node_modules', 'katex')):
            raise SystemExit('New or changed math needs KaTeX once: cd tools && npm install  (Node 18 or later), then build again.')
        jobs = [{'tex': k[2:], 'display': k[0] == 'D'} for k in missing]
        run = subprocess.run(['node', tool], input=json.dumps(jobs), capture_output=True, text=True, cwd=os.path.join(ROOT, 'tools'))
        if run.returncode:
            raise SystemExit('KaTeX could not render the math:\n' + run.stderr.strip().split('\n')[-1])
        cache.update(zip(missing, json.loads(run.stdout)))
    used = {k: cache[k] for k in sorted(set(keys))}
    if used != disk:
        with open(MATH_PATH, 'wb') as fh, gzip.GzipFile(fileobj=fh, mode='wb', mtime=0, filename='') as gz:
            gz.write(json.dumps(used, ensure_ascii=False, indent=0, sort_keys=True).encode('utf-8'))
    styles = {}

    def classify(m):
        tag = m.group(0)
        sm = re.search(r' style="([^"]*)"', tag)
        if not sm:
            return tag
        decl = sm.group(1).strip()
        name = 'k' + hashlib.sha1(decl.encode()).hexdigest()[:7]
        styles[name] = decl
        tag = tag.replace(sm.group(0), '')
        if re.search(r' class="', tag):
            return re.sub(r' class="([^"]*)"', lambda c: ' class="%s %s"' % (c.group(1), name), tag, count=1)
        return re.sub(r'^<([\w:-]+)', r'<\1 class="%s"' % name, tag)

    html_of = {k: re.sub(r'<[a-zA-Z][^>]*\sstyle="[^"]*"[^>]*>', classify, v) for k, v in used.items()}
    out = {path: re.sub('\x00M(\\d+)\x00', lambda m: html_of[keys[int(m.group(1))]], html) for path, html in pages.items()}
    rules = ''.join('.%s{%s}\n' % (n, ';'.join(d.strip() + '!important' for d in styles[n].split(';') if d.strip())) for n in sorted(styles))
    with open(os.path.join(ROOT, 'assets', 'math.css'), 'w', encoding='utf-8') as fh:
        fh.write('/* Generated by build.py: KaTeX layout values as classes, so the page needs no inline styles. */\n' + rules)
    return out


def head(title, desc, canonical, extra=''):
    return '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta name="color-scheme" content="light dark">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:type" content="website">
<meta property="og:image" content="{base}/assets/portrait.jpg">
<meta name="twitter:card" content="summary">
{extra}<link rel="alternate" type="text/markdown" href="/llms.txt" title="Plain text summary for AI agents">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/site.js" defer></script>
<script data-goatcounter="https://pedrofrackebrandt.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>'''.format(csp=CSP, title=escape(title), desc=escape(desc), canonical=canonical, base=BASE, extra=extra)


def featured_card(p):
    parts = ['<article class="paper" data-topic="%s">' % escape(p['topic']),
             '  <div class="paper-head">',
             '    <h3><a href="%s">%s</a></h3>' % (url_of(p), escape(p['title']))]
    if byline(p):
        parts.append('    <p class="byline">%s</p>' % byline(p))
    parts.append('  </div>')
    if p.get('figure'):
        parts += ['  <div class="paper-fig">', indent(figure(p['figure']), 4), '  </div>']
    parts.append('  <div class="paper-body">')
    parts += ['    <p>%s</p>' % escape(x) for x in p['text']]
    if help_html(p):
        parts.append(indent(help_html(p), 4))
    parts.append('    <div class="paper-tags">%s<a class="go" href="%s">Paper page &rarr;</a></div>' % (tags_html(p), url_of(p)))
    parts += ['  </div>', '</article>']
    return '\n'.join(parts)


def index_list(papers):
    topics = []
    for p in papers:
        if p['topic'] not in topics:
            topics.append(p['topic'])
    # filters only earn their place once the list is long enough to need them
    filters = ''
    if len(papers) >= SITE.get('filters_from', 8) and len(topics) > 1:
        btns = ['<button class="filter" type="button" data-topic="" aria-pressed="true">All<span class="count">%d</span></button>' % len(papers)]
        for t in topics:
            n = sum(1 for p in papers if p['topic'] == t)
            btns.append('<button class="filter" type="button" data-topic="%s" aria-pressed="false">%s<span class="count">%d</span></button>'
                        % (escape(t), escape(t), n))
        filters = '\n    <div class="filters" role="group" aria-label="Filter papers by topic">%s</div>' % ''.join(btns)
    ordered = sorted(papers, key=lambda p: -int(p['year']))
    years = []
    for p in ordered:
        if p['year'] not in years:
            years.append(p['year'])
    groups = []
    for y in years:
        rows = []
        for p in [q for q in ordered if q['year'] == y]:
            meta = escape(p['status'])
            if p.get('coauthors'):
                meta += ' &middot; with ' + escape(', '.join(c['name'].split()[-1] for c in p['coauthors']))
            rows.append('''        <li class="row" data-topic="{topic}">
          <details>
            <summary><span class="row-title">{title}</span><span class="row-meta">{meta}</span></summary>
            <div class="row-body"><p>{summary}</p><a class="go" href="{url}">Paper page &rarr;</a></div>
          </details>
        </li>'''.format(topic=escape(p['topic']), title=escape(p['title']), meta=meta, summary=escape(p['summary']), url=url_of(p)))
        groups.append('    <div class="year-group">\n      <h4 class="year">%s</h4>\n      <ul class="rows">\n%s\n      </ul>\n    </div>'
                      % (y, '\n'.join(rows)))
    return '''  <div class="index" data-limit="{limit}">
    <h3 class="vh">All papers</h3>{filters}
{groups}
    <button class="show-all" type="button" hidden>Show all</button>
  </div>'''.format(limit=SITE.get('list_collapsed', 10), filters=filters, groups='\n'.join(groups))


def build_index():
    socials = ['<a class="js-email" href="#contact" title="Email" aria-label="Email">%s</a>' % ICONS['email']]
    socials += ['<a href="%s" title="%s" aria-label="%s" rel="noopener noreferrer me">%s</a>'
                % (escape(s['url']), s['label'], s['label'], ICONS[s['icon']]) for s in SITE['socials']]
    bio = '\n'.join('        <p>%s</p>' % b for b in SITE['bio'])
    featured = [p for p in PAPERS if p.get('featured')]
    cards = '\n'.join(indent(featured_card(p), 8) for p in featured)
    tools = '\n'.join('''        <div class="tool">
          <h3>{name}</h3>
          <p>{text}</p>{tags}
        </div>'''.format(name=escape(t['name']), text=escape(t['text']),
                         tags=('\n          <div class="paper-tags">%s</div>' % ''.join('<span class="tag">%s</span>' % escape(x) for x in t['tags'])) if t.get('tags') else '')
                      for t in SITE['tools'])
    topics = []
    for p in PAPERS:
        for t in [p['topic']] + list(p.get('tags', [])):
            if t not in topics:
                topics.append(t)
    person = json.dumps({"@context": "https://schema.org", "@type": "Person", "name": SITE['name'], "url": BASE + '/',
                         "description": SITE['description'], "knowsAbout": topics,
                         "subjectOf": [{"@type": "ScholarlyArticle", "name": p['title'], "url": BASE + url_of(p)} for p in PAPERS],
                         "affiliation": {"@type": "CollegeOrUniversity", "name": "Merton College, University of Oxford"},
                         "sameAs": [s['url'] for s in SITE['socials']]})
    html = head(SITE['name'], SITE['description'], BASE + '/',
                '<script type="application/ld+json">%s</script>\n' % person) + '''
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">

  <header class="intro">
    <div class="intro-text">
      <h1 class="name">{name}</h1>
      <div class="bio">
{bio}
      </div>
    </div>
    <div class="portrait-col">
      <img class="portrait" src="/assets/portrait.jpg" alt="{name}" width="440" height="440">
      <nav class="socials" aria-label="Elsewhere">{socials}</nav>
    </div>
  </header>

  <div class="tabs-sentinel" aria-hidden="true"></div>
  <div class="tabbar">
    <nav class="tabs" role="tablist" aria-label="Sections">
      <a class="tab" role="tab" id="tab-research" href="#research" aria-controls="research" aria-selected="true">Research<span class="count">{np}</span></a>
      <a class="tab" role="tab" id="tab-tools" href="#tools" aria-controls="tools" aria-selected="false" tabindex="-1">Tools<span class="count">{nt}</span></a>
    </nav>
    <div class="views" role="group" aria-label="Show research as" hidden>
      <button class="view" type="button" data-view="list" aria-pressed="{list_on}">List</button>
      <button class="view" type="button" data-view="visual" aria-pressed="{visual_on}">Visual</button>
    </div>
  </div>

  <main id="main">
    <section class="panel" id="research" role="tabpanel" aria-labelledby="tab-research" data-view="{view}">
      <h2 class="vh">Research</h2>
{index}
      <div class="panel-head selected-head"><h3 class="label">Selected</h3><p class="kicker">{rk}</p></div>
      <div class="papers">
{cards}
      </div>
    </section>

    <section class="panel" id="tools" role="tabpanel" aria-labelledby="tab-tools">
      <h2 class="vh">Tools</h2>
      <div class="panel-head"><span></span><p class="kicker">{tk}</p></div>
      <div class="tools">
{tools}
      </div>
    </section>
  </main>

</div>
</body>
</html>
'''.format(name=escape(SITE['name']), bio=bio, socials=''.join(socials), np=len(PAPERS), nt=len(SITE['tools']),
           view=VIEW, list_on='true' if VIEW == 'list' else 'false', visual_on='true' if VIEW == 'visual' else 'false',
           rk=escape(SITE.get('research_kicker', '')), tk=escape(SITE.get('tools_kicker', '')),
           cards=cards, index=indent(index_list(PAPERS), 4), tools=tools)
    return html


def build_paper(p):
    authors = author_list(p)
    canonical = BASE + url_of(p)
    meta = ['<meta name="citation_title" content="%s">' % escape(p['title'])]
    meta += ['<meta name="citation_author" content="%s">' % escape(last_first(a)) for a in authors]
    meta.append('<meta name="citation_publication_date" content="%s">' % p['year'])
    links = p.get('links', {})
    if links.get('pdf'):
        meta.append('<meta name="citation_pdf_url" content="%s">' % escape(links['pdf']))
    article = {"@context": "https://schema.org", "@type": "ScholarlyArticle", "headline": p['title'], "name": p['title'],
               "author": [{"@type": "Person", "name": a} for a in authors], "datePublished": str(p['year']),
               "creativeWorkStatus": p['status'], "about": [p['topic']] + list(p.get('tags', [])),
               "abstract": plain(' '.join(p['text'])), "description": p['summary'], "url": canonical,
               "isAccessibleForFree": True}
    if links.get('pdf'):
        article["encoding"] = {"@type": "MediaObject", "contentUrl": links['pdf'], "encodingFormat": "application/pdf"}
    meta.append('<script type="application/ld+json">%s</script>' % json.dumps(article, ensure_ascii=False).replace('</', '<\\/'))
    actions = []
    if links.get('pdf'):
        actions.append('<a class="btn" href="%s">PDF</a>' % escape(links['pdf']))
    else:
        actions.append('<a class="btn js-email" href="#contact" data-subject="%s">Draft on request</a>' % escape('Draft request: ' + p['title']))
    for k, label in (('arxiv', 'arXiv'), ('code', 'Code'), ('data', 'Data')):
        if links.get(k):
            actions.append('<a class="btn" href="%s" rel="noopener noreferrer">%s</a>' % (escape(links[k]), label))
    fig = ''
    if p.get('figure'):
        fig = '    <div class="page-fig">\n%s\n    </div>\n' % indent(figure(p['figure']), 6)
    body = md_html(explainer(p))
    extra = '\n'.join(meta) + '\n'
    if '\x00M' in body:
        extra += ('<link rel="stylesheet" href="/assets/katex/katex.css">\n<link rel="stylesheet" href="/assets/math.css">\n'
                  '<link rel="preload" href="/assets/katex/fonts/KaTeX_Main-Regular.woff2" as="font" type="font/woff2" crossorigin>\n'
                  '<link rel="preload" href="/assets/katex/fonts/KaTeX_Math-Italic.woff2" as="font" type="font/woff2" crossorigin>\n')
    if body:
        body = '    <div class="explainer">\n%s\n    </div>\n' % indent(body, 6)
    who = escape(SITE['name']) + ((', ' + byline(p)) if byline(p) else '')
    bib_id = 'bib-' + p['slug']
    html = head('%s · %s' % (p['title'], SITE['name']), p['summary'], canonical, extra) + """
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="page-top"><a class="back" href="/#research">&larr; {name}</a></header>
  <main id="main">
  <article class="paper-page">
    <p class="eyebrow">{status} &middot; {year}</p>
    <h1>{title}</h1>
    <p class="authors">{who}</p>
    <div class="abstract">
{text}
    </div>
    <div class="actions">{actions}</div>
{fig}{help}
{body}    <div class="paper-tags">{tags}</div>
    <details class="more">
      <summary>Cite</summary>
      <pre class="bib" id="{bib_id}">{bib}</pre>
      <button class="btn" type="button" data-copy="{bib_id}">Copy BibTeX</button>
    </details>
  </article>
  </main>
</div>
</body>
</html>
""".format(name=escape(SITE['name']), status=escape(p['status']), year=p['year'], title=escape(p['title']), who=who, fig=fig,
           text=('      <p class="lede">%s</p>' % escape(p['summary'])) if body else '\n'.join('      <p>%s</p>' % escape(x) for x in p['text']), help=indent(help_html(p), 4) if help_html(p) else '',
           body=body, tags=tags_html(p), actions=''.join(actions), bib_id=bib_id, bib=escape(bibtex(p)))
    return html


def build_llms():
    lines = ['# %s' % SITE['name'], '', '> %s' % SITE['description'], '']
    for b in SITE['bio']:
        lines += [bio_for_agents(b), '']
    lines += ['## Research', '']
    for p in sorted(PAPERS, key=lambda q: -int(q['year'])):
        who = (' With %s.' % ', '.join(c['name'] for c in p['coauthors'])) if p.get('coauthors') else ''
        extra = ''.join(' %s: %s.' % (k.upper() if k == 'pdf' else k.capitalize(), v) for k, v in p.get('links', {}).items() if v)
        lines.append('- [%s](%s%s): %s, %s. Topic: %s.%s %s%s' % (p['title'], BASE, url_of(p), p['status'], p['year'], p['topic'], who, p['summary'], extra))
    lines += ['', '## Tools (coming soon)', '']
    for t in SITE['tools']:
        tags = (' (%s)' % ', '.join(t['tags'])) if t.get('tags') else ''
        lines.append('- %s%s: %s' % (t['name'], tags, plain(t['text'])))
    lines += ['', '## Elsewhere', '']
    lines += ['- [%s](%s)' % (s['label'], s['url']) for s in SITE['socials']]
    lines += ['', '## Optional', '', '- [Full text of every paper summary](%s/llms-full.txt)' % BASE, '']
    return '\n'.join(lines)


def build_llms_full():
    out = ['# %s: research in full' % SITE['name'], '', '> Every paper summary from %s/, as plain text.' % BASE, '']
    for p in sorted(PAPERS, key=lambda q: -int(q['year'])):
        authors = ', '.join(author_list(p))
        out += ['## %s' % p['title'], '', '%s, %s. %s. Topic: %s. Tags: %s. Page: %s%s' % (
            authors, p['year'], p['status'], p['topic'], ', '.join(p.get('tags', [])) or 'none', BASE, url_of(p)), '']
        out += [plain(x) + '\n' for x in p['text']]
        if p.get('figure_help'):
            out += ['How to read the figure:', ''] + [plain(x) + '\n' for x in p['figure_help']]
        if explainer(p):
            out += [re.sub(r'^(#+) ', lambda m: '#' + m.group(1) + ' ', explainer(p).strip(), flags=re.M), '']
    return '\n'.join(out)


def main():
    slugs = [p['slug'] for p in PAPERS]
    assert len(slugs) == len(set(slugs)), 'duplicate slug'
    for p in PAPERS:
        for k in ('slug', 'title', 'year', 'status', 'topic', 'summary', 'text'):
            assert p.get(k), '%s is missing %s' % (p.get('slug'), k)
    pages = {os.path.join(ROOT, 'index.html'): build_index()}
    for p in PAPERS:
        pages[os.path.join(ROOT, 'papers', p['slug'], 'index.html')] = build_paper(p)
    for path, html in resolve_math(pages).items():
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'w', encoding='utf-8').write(html)
    urls = [BASE + '/'] + [BASE + url_of(p) for p in PAPERS]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % (
        '\n'.join('  <url><loc>%s</loc></url>' % u for u in urls))
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    open(os.path.join(ROOT, 'llms.txt'), 'w', encoding='utf-8').write(build_llms())
    open(os.path.join(ROOT, 'llms-full.txt'), 'w', encoding='utf-8').write(build_llms_full())
    print('built index.html, %d paper pages, sitemap.xml, llms.txt, llms-full.txt' % len(PAPERS))


if __name__ == '__main__':
    main()
