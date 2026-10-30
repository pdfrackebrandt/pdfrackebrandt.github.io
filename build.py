#!/usr/bin/env python3
"""Build rackebrandt.pe from data/*.json.

Edit data/papers.json, data/notes.json or data/site.json, run `python3 build.py`, commit everything.
Writes index.html, papers/<slug>/index.html, notes/index.html, notes/<slug>/index.html, sitemap.xml,
llms.txt, llms-full.txt and assets/math.css. Never edit those generated files by hand.
Paper explainers live in content/<slug>.md and lecture notes in content/notes/<slug>.md
(Markdown with LaTeX math; see the notes above md_html).
Lecture notes are private: they ship encrypted and open in the browser with the password (see the notes above seal).
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
NOTES_PATH = os.path.join(ROOT, 'data', 'notes.json')
NOTES = []        # loaded in main(): data/notes.json (local only, git ignores it) or its sealed copy data/notes.json.sealed
PASSWORD = None   # set in main() from NOTES_PASSWORD or .notes-password
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


def note_url(n):
    return '/notes/%s/' % n['slug']


def note_tag(n):
    return '%s &middot; %s' % (escape(n['course']), escape(n['label']))


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
#   ::: short|intuition|note|takeaway  then text, then :::  (a labelled box)
#   [[figure]]  marks where a paper's main figure sits on phones      [[fig name]]  inlines src/figures/name.html
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
    # punctuation right after inline math stays on its line ($x$. never wraps the full stop to the next line)
    s = re.sub(r'\$([^$\n]+?)\$([.,;:!?)\]]*)', lambda m: stash(
        '<span class="mp">%s%s</span>' % (math_token(m.group(1), False), escape(m.group(2))) if m.group(2) else math_token(m.group(1), False)), s)
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


BOX_LABELS = {'short': 'In short', 'intuition': 'Intuition', 'note': 'Note', 'takeaway': 'Takeaway'}
FIG_SLOT = '\x04FIGURE\x04'


def md_html(src):
    raw = []

    def fence(m):
        kind, inner = m.group(1), m.group(2)
        label = BOX_LABELS.get(kind, '')
        raw.append('<div class="box %s">%s%s</div>' % (kind, '<p class="box-label">%s</p>' % label if label else '', md_html(inner)))
        return '\n\n\x03%d\x03\n\n' % (len(raw) - 1)

    src = re.sub(r'^:::[ \t]*(\w+)[ \t]*\n(.*?)\n:::[ \t]*$', fence, src.replace('\r', ''), flags=re.M | re.S)
    src = re.sub(r'\$\$(.+?)\$\$', lambda m: '\n\n$$%s$$\n\n' % m.group(1), src, flags=re.S)
    out = []
    for block in re.split(r'\n\s*\n', src.strip()):
        lines = [l for l in block.split('\n') if l.strip()]
        if not lines:
            continue
        first = lines[0]
        tok = re.fullmatch(r'\s*\x03(\d+)\x03\s*', block)
        if tok:
            out.append(raw[int(tok.group(1))])
        elif block.strip() == '[[figure]]':
            out.append(FIG_SLOT)
        elif re.fullmatch(r'\[\[fig [\w-]+\]\]', block.strip()):
            out.append(figure(block.strip()[6:-2]))
        elif block.lstrip().startswith(('<svg', '<figure')):
            out.append(block.strip())
        elif block.strip().startswith('$$'):
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


def version(path):
    """Short content hash for cache busting: a changed file gets a new URL, so browsers fetch it at once."""
    return hashlib.sha1(open(os.path.join(ROOT, path), 'rb').read()).hexdigest()[:8]


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
<link rel="stylesheet" href="/assets/site.css?v={vcss}">
<script src="/assets/site.js?v={vjs}" defer></script>
<script data-goatcounter="https://pedrofrackebrandt.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>'''.format(csp=CSP, title=escape(title), desc=escape(desc), canonical=canonical, base=BASE, extra=extra,
           vcss=version('assets/site.css'), vjs=version('assets/site.js'))


def math_links():
    return ('<link rel="stylesheet" href="/assets/katex/katex.css?v=%s">\n<link rel="stylesheet" href="/assets/math.css?v=\x02MATHV\x02">\n'
            '<link rel="preload" href="/assets/katex/fonts/KaTeX_Main-Regular.woff2" as="font" type="font/woff2" crossorigin>\n'
            '<link rel="preload" href="/assets/katex/fonts/KaTeX_Math-Italic.woff2" as="font" type="font/woff2" crossorigin>\n'
            % version('assets/katex/katex.css'))


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


NOTE_CARD = """        <div class="tool note-card">
          <p class="eyebrow">{tag}</p>
          <h3><a href="{url}">{title}</a></h3>
          <p>{summary}</p>
          <a class="go" href="{url}">Read the notes &rarr;</a>
        </div>"""

NOTE_PANEL = """

    <section class="panel" id="notes" role="tabpanel" aria-labelledby="tab-notes">
      <h2 class="vh">Notes</h2>
%s
    </section>"""

LOCK_GLYPH = ('<svg class="tab-lock-icon" viewBox="0 0 12 14" aria-hidden="true"><path d="M3.5 6.5V4.5a2.5 2.5 0 0 1 5 0v2"/>'
              '<rect x="1.5" y="6.5" width="9" height="6.5" rx="1.2"/></svg>')


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
    notes = '\n'.join(NOTE_CARD.format(tag=note_tag(n), url=note_url(n), title=escape(n['title']), summary=escape(n['summary']))
                      for n in NOTES)
    notes_tab = notes_panel = owns = ''
    if NOTES or LOCK.get('home'):
        # the Notes tab sits at the right end of the tab row, after the List or Visual switch; aria-owns keeps it in the tablist
        owns = ' aria-owns="tab-notes"'
        notes_tab = ('\n    <a class="tab tab-notes" role="tab" id="tab-notes" href="#notes" aria-controls="notes" aria-selected="false" tabindex="-1">'
                     'Notes<span class="count tab-lock" data-locked>%s</span></a>' % LOCK_GLYPH)
        notes_panel = NOTE_PANEL % sealed_block('home', '      <div class="tools">\n%s\n      </div>' % notes, indent_by=6)
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
    <nav class="tabs" role="tablist" aria-label="Sections"{owns}>
      <a class="tab" role="tab" id="tab-research" href="#research" aria-controls="research" aria-selected="true">Research<span class="count">{np}</span></a>
      <a class="tab" role="tab" id="tab-tools" href="#tools" aria-controls="tools" aria-selected="false" tabindex="-1">Tools<span class="count">{nt}</span></a>
    </nav>
    <div class="views" role="group" aria-label="Show research as" hidden>
      <button class="view" type="button" data-view="list" aria-pressed="{list_on}">List</button>
      <button class="view" type="button" data-view="visual" aria-pressed="{visual_on}">Visual</button>
    </div>{notes_tab}
  </div>

  <main id="main">
    <section class="panel" id="research" role="tabpanel" aria-labelledby="tab-research" data-view="{view}">
      <h2 class="vh">Research</h2>
{index}
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
    </section>{notes_panel}
  </main>

</div>
</body>
</html>
'''.format(name=escape(SITE['name']), bio=bio, socials=''.join(socials), np=len(PAPERS), nt=len(SITE['tools']),
           view=VIEW, list_on='true' if VIEW == 'list' else 'false', visual_on='true' if VIEW == 'visual' else 'false',
           tk=escape(SITE.get('tools_kicker', '')),
           cards=cards, index=indent(index_list(PAPERS), 4), tools=tools, notes_tab=notes_tab, notes_panel=notes_panel, owns=owns)
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
        actions.append('<a href="%s">PDF</a>' % escape(links['pdf']))
    else:
        actions.append('<a class="js-email" href="#contact" data-subject="%s">Draft on request</a>' % escape('Draft request: ' + p['title']))
    for k, label in (('arxiv', 'arXiv'), ('code', 'Code'), ('data', 'Data')):
        if links.get(k):
            actions.append('<a href="%s" rel="noopener noreferrer">%s</a>' % (escape(links[k]), label))
    actions.append('<a href="#cite">Cite</a>')
    fig = ''
    if p.get('figure'):
        fig = '<figure class="page-fig">\n%s\n%s</figure>' % (figure(p['figure']), help_html(p))
    body = md_html(explainer(p)) or '\n'.join('<p>%s</p>' % escape(x) for x in p['text'])
    # on wide screens the figure sits in a sticky right column; on phones it follows the "In short" box
    pre, post = body.split(FIG_SLOT, 1) if FIG_SLOT in body else ('', body)
    lead = '<div class="explainer explainer-lead">\n%s\n</div>\n' % pre.strip() if pre.strip() else ''
    if fig:
        fig = fig.replace('<figure class="page-fig">', '<figure class="page-fig rows-%d">' % (4 if lead else 3), 1) + '\n'
    extra = '\n'.join(meta) + '\n'
    if '\x00M' in body:
        extra += math_links()
    who = escape(SITE['name']) + ((', ' + byline(p)) if byline(p) else '')
    bib_id = 'bib-' + p['slug']
    html = head('%s · %s' % (p['title'], SITE['name']), p['summary'], canonical, extra) + """
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="page-top"><a class="back" href="/#research">&larr; {name}</a></header>
  <main id="main">
  <article class="paper-page">
    <header class="paper-header">
      <p class="eyebrow">{status} &middot; {year}</p>
      <h1>{title}</h1>
      <p class="authors">{who}</p>
      <p class="lede">{lede}</p>
      <p class="page-actions">{actions}</p>
    </header>
{lead}{fig}    <div class="explainer">
{body}
    </div>
    <footer class="paper-foot">
      <div class="paper-tags">{tags}</div>
      <details class="more" id="cite">
        <summary>Cite</summary>
        <pre class="bib" id="{bib_id}">{bib}</pre>
        <button class="btn" type="button" data-copy="{bib_id}">Copy BibTeX</button>
      </details>
    </footer>
  </article>
  </main>
</div>
</body>
</html>
""".format(name=escape(SITE['name']), status=escape(p['status']), year=p['year'], title=escape(p['title']), who=who,
           lede=escape(p['summary']), actions='<span aria-hidden="true">&middot;</span>'.join(actions),
           lead=indent(lead, 4), fig=indent(fig, 4), body=indent(post.strip(), 6), tags=tags_html(p), bib_id=bib_id, bib=escape(bibtex(p)))
    return html


# ---------------------------------------------------------------------------
# Private notes. Everything a visitor could read (the Notes panel on the home page, /notes/ and each note) is
# encrypted at build time with AES-256-GCM under a key derived from the password (PBKDF2-SHA256), and decrypted in
# the browser by assets/site.js once the visitor types the password. The plain Markdown never enters the repo:
# content/notes/<slug>.md stays local (git ignores it) and the repo keeps content/notes/<slug>.md.sealed.
# The password comes from the NOTES_PASSWORD environment variable or the file .notes-password (git ignores it too).
# Without it the build still runs: it leaves notes/ as it is and reuses the sealed home panel from data/notes-lock.json.
# Sealing needs Node (tools/seal.mjs, no packages). A short password keeps casual visitors out, not a determined attacker.

LOCK_PATH = os.path.join(ROOT, 'data', 'notes-lock.json')
LOCK = json.load(open(LOCK_PATH, encoding='utf-8')) if os.path.exists(LOCK_PATH) else {}
SEAL_RE = re.compile('\x05S([\\w/.-]+)\x05(.*?)\x05E\x05', re.S)


def notes_password():
    pw = os.environ.get('NOTES_PASSWORD')
    f = os.path.join(ROOT, '.notes-password')
    if not pw and os.path.exists(f):
        pw = open(f, encoding='utf-8').read().strip()
    return pw or None


def seal(mode, items):
    run = subprocess.run(['node', os.path.join(ROOT, 'tools', 'seal.mjs')], capture_output=True, text=True,
                         input=json.dumps({'mode': mode, 'password': PASSWORD, 'salt': LOCK['salt'], 'iter': LOCK['iter'], 'items': items}))
    if run.returncode:
        raise SystemExit('Sealing failed (wrong password?):\n' + run.stderr.strip().split('\n')[-1])
    return json.loads(run.stdout)


def setup_lock():
    """Check the password against the stored check value, or start a new lock on the first build."""
    if not PASSWORD:
        return
    if not LOCK.get('salt'):
        import base64
        LOCK.update(salt=base64.b64encode(os.urandom(16)).decode(), iter=310000)
        LOCK['check'] = {k: v for k, v in seal('seal', [{'id': 'check', 'text': 'rackebrandt notes'}])[0].items() if k != 'id'}
    else:
        seal('open', [dict(LOCK['check'], id='check')])


def load_notes():
    """The list of notes is private too: the repo keeps only data/notes.json.sealed."""
    sealed = NOTES_PATH + '.sealed'
    if os.path.exists(NOTES_PATH):
        text = open(NOTES_PATH, encoding='utf-8').read()
        if PASSWORD:
            box = {k: v for k, v in seal('seal', [{'id': 'notes.json', 'text': text}])[0].items() if k != 'id'}
            old = json.load(open(sealed, encoding='utf-8')) if os.path.exists(sealed) else None
            if box != old:
                json.dump(box, open(sealed, 'w', encoding='utf-8'), indent=0)
        return json.loads(text)
    if os.path.exists(sealed) and PASSWORD:
        return json.loads(seal('open', [dict(json.load(open(sealed, encoding='utf-8')), id='notes.json')])[0]['text'])
    return []


def note_source(n):
    f = os.path.join(ROOT, 'content', 'notes', n['slug'] + '.md')
    sealed = f + '.sealed'
    if os.path.exists(f):
        text = open(f, encoding='utf-8').read()
        if PASSWORD:
            box = {k: v for k, v in seal('seal', [{'id': 'src/' + n['slug'], 'text': text}])[0].items() if k != 'id'}
            old = json.load(open(sealed, encoding='utf-8')) if os.path.exists(sealed) else None
            if box != old:
                json.dump(box, open(sealed, 'w', encoding='utf-8'), indent=0)
        return text
    if os.path.exists(sealed) and PASSWORD:
        return seal('open', [dict(json.load(open(sealed, encoding='utf-8')), id='src/' + n['slug'])])[0]['text']
    return ''


def sealed_block(sid, html, indent_by=4):
    """Mark html for sealing; seal_pages swaps the marked span for the lock and the ciphertext after math is rendered."""
    return indent('\x05S%s\x05%s\x05E\x05' % (sid, html), indent_by)


LOCK_HTML = """<div class="locked" data-lock>
  <div class="lockbox">
    <svg class="lock-icon" viewBox="0 0 32 40" aria-hidden="true"><path class="lock-shackle" d="M9 18v-6a7 7 0 0 1 14 0v6"/><rect class="lock-body" x="4" y="18" width="24" height="19" rx="3.5"/><path class="lock-hole" d="M16 25.5v4"/></svg>
    <p class="lock-title">Private notes</p>
    <p class="lock-sub">Type the password to open them.</p>
    <form class="lock-form" novalidate>
      <label class="lock-field"><span class="vh">Password</span><input type="password" name="password" autocomplete="current-password" placeholder="Password" spellcheck="false"></label>
      <button class="lock-go" type="submit" aria-label="Open the notes"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5"/></svg></button>
    </form>
    <p class="lock-msg" role="status" aria-live="polite"></p>
  </div>
  <div class="sealed" hidden data-salt="{salt}" data-iter="{iter}" data-iv="{iv}">{ct}</div>
  <div class="unsealed"></div>
</div>"""


def lock_html(box, indent_text):
    return indent(LOCK_HTML.format(salt=LOCK['salt'], iter=LOCK['iter'], iv=box['iv'], ct=box['ct']), len(indent_text)).lstrip()


def seal_pages(pages):
    """Encrypt every marked span. Without the password only the home panel can be filled, from the last sealed copy."""
    found = {}
    for path, html in pages.items():
        for m in SEAL_RE.finditer(html):
            found[m.group(1)] = m.group(2)
    boxes = {}
    if PASSWORD and found:
        boxes = {b['id']: {'iv': b['iv'], 'ct': b['ct']} for b in seal('seal', [{'id': k, 'text': v.strip()} for k, v in found.items()])}
        if LOCK.get('home') != boxes.get('home'):
            LOCK['home'] = boxes.get('home')
    elif LOCK.get('home'):
        boxes['home'] = LOCK['home']

    def swap(m):
        box = boxes.get(m.group(1))
        line_start = m.string.rfind('\n', 0, m.start()) + 1
        return lock_html(box, m.string[line_start:m.start()]) if box else ''
    return {path: SEAL_RE.sub(swap, html) for path, html in pages.items()}


def note_head(title, desc, canonical, body):
    extra = '<meta name="robots" content="noindex, nofollow">\n'
    extra += math_links() if '\x00M' in body else ''
    if 'data-nfig' in body:
        extra += ('<link rel="stylesheet" href="/assets/notes.css?v=%s">\n<script src="/assets/notes.js?v=%s" defer></script>\n'
                  % (version('assets/notes.css'), version('assets/notes.js')))
    return head(title, desc, canonical, extra)


def toc_items(body):
    return ''.join('<li><a href="#%s">%s</a></li>' % (m.group(1), m.group(2))
                   for m in re.finditer(r'<h2 id="([^"]+)">(.*?)</h2>', body))


def build_note(n):
    canonical = BASE + note_url(n)
    body = md_html(note_source(n))
    toc = toc_items(body)
    course = [m for m in NOTES if m['course'] == n['course']]
    others = ''
    if len(course) > 1:
        others = '\n      <p class="toc-label">%s</p>\n      <ol class="toc-list">%s</ol>' % (escape(n['course']), ''.join(
            '<li><a href="%s"%s>%s %s</a></li>' % (note_url(m), ' aria-current="page"' if m is n else '', escape(m['label']), escape(m['title']))
            for m in course))
    article = """<article class="paper-page note-page">
    <header class="paper-header">
      <p class="eyebrow">{tag}</p>
      <h1>{title}</h1>
      <p class="lede">{lede}</p>
      <p class="page-actions"><a href="/notes/">All notes</a></p>
    </header>
    <nav class="toc toc-wide" aria-label="On this page">
      <p class="toc-label">On this page</p>
      <ol class="toc-list">{toc}</ol>{others}
    </nav>
    <details class="toc toc-narrow">
      <summary>On this page</summary>
      <ol class="toc-list">{toc}</ol>
    </details>
    <div class="explainer">
{body}
    </div>
  </article>""".format(tag=note_tag(n), title=escape(n['title']), lede=escape(n['summary']), toc=toc, others=others, body=indent(body, 6))
    return note_head('Notes · %s' % SITE['name'], 'Private notes.', canonical, body) + """
<body class="notes-body">
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="page-top"><a class="back" href="/#notes">&larr; {name}</a></header>
  <main id="main">
{article}
  </main>
</div>
</body>
</html>
""".format(name=escape(SITE['name']), article=sealed_block(note_url(n).strip('/'), article, 2))


def build_notes_index():
    courses = []
    for n in NOTES:
        if n['course'] not in courses:
            courses.append(n['course'])
    groups = []
    for c in courses:
        rows = ''.join("""
        <li class="note-row"><a href="{url}"><span class="note-label">{label}</span><span class="note-title">{title}</span></a>
          <p>{summary}</p></li>""".format(url=note_url(n), label=escape(n['label']), title=escape(n['title']), summary=escape(n['summary']))
                       for n in NOTES if n['course'] == c)
        groups.append('      <section class="note-course">\n        <h2>%s</h2>\n        <ol class="note-rows">%s\n        </ol>\n      </section>'
                      % (escape(c), rows))
    listing = """<div class="notes-index">
  <header class="paper-header">
    <p class="eyebrow">{kicker}</p>
    <h1>Notes</h1>
    <p class="lede">Lecture notes written to be read with the figures: move the sliders and watch the result.</p>
  </header>
{groups}
</div>""".format(kicker=escape(SITE.get('notes_kicker', '')), groups='\n'.join(groups))
    return note_head('Notes · %s' % SITE['name'], 'Private notes.', BASE + '/notes/', '') + """
<body class="notes-body">
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="page-top"><a class="back" href="/#notes">&larr; {name}</a></header>
  <main id="main">
{listing}
  </main>
</div>
</body>
</html>
""".format(name=escape(SITE['name']), listing=sealed_block('notes', listing, 2))


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
    global PASSWORD, NOTES
    PASSWORD = notes_password()
    slugs = [p['slug'] for p in PAPERS]
    assert len(slugs) == len(set(slugs)), 'duplicate slug'
    for p in PAPERS:
        for k in ('slug', 'title', 'year', 'status', 'topic', 'summary', 'text'):
            assert p.get(k), '%s is missing %s' % (p.get('slug'), k)
    setup_lock()
    NOTES = load_notes()
    pages = {os.path.join(ROOT, 'index.html'): build_index()}
    for p in PAPERS:
        pages[os.path.join(ROOT, 'papers', p['slug'], 'index.html')] = build_paper(p)
    slugs = [n['slug'] for n in NOTES]
    assert len(slugs) == len(set(slugs)), 'duplicate note slug'
    if NOTES and PASSWORD:
        pages[os.path.join(ROOT, 'notes', 'index.html')] = build_notes_index()
        for n in NOTES:
            for k in ('slug', 'course', 'label', 'title', 'summary'):
                assert n.get(k), '%s is missing %s' % (n.get('slug'), k)
            assert note_source(n), 'content/notes/%s.md (or .md.sealed) is missing' % n['slug']
            pages[os.path.join(ROOT, 'notes', n['slug'], 'index.html')] = build_note(n)
    elif NOTES:
        print('No notes password (NOTES_PASSWORD or .notes-password): notes/ left as it is.')
    pages = resolve_math(pages)
    pages = {path: html.replace('\x02MATHV\x02', version('assets/math.css')) for path, html in pages.items()}
    for path, html in seal_pages(pages).items():
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'w', encoding='utf-8').write(html)
    if PASSWORD:
        json.dump(LOCK, open(LOCK_PATH, 'w', encoding='utf-8'), indent=1, sort_keys=True)
    urls = [BASE + '/'] + [BASE + url_of(p) for p in PAPERS]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % (
        '\n'.join('  <url><loc>%s</loc></url>' % u for u in urls))
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    open(os.path.join(ROOT, 'llms.txt'), 'w', encoding='utf-8').write(build_llms())
    open(os.path.join(ROOT, 'llms-full.txt'), 'w', encoding='utf-8').write(build_llms_full())
    print('built index.html, %d paper pages, %d note pages, sitemap.xml, llms.txt, llms-full.txt' % (len(PAPERS), len(NOTES)))


if __name__ == '__main__':
    main()
