#!/usr/bin/env python3
"""Build rackebrandt.pe from data/*.json.

Edit data/papers.json or data/site.json, run `python3 build.py`, commit everything.
Writes index.html, papers/<slug>/index.html and sitemap.xml. Standard library only.
"""
import json
import os
import re
from datetime import date
from html import escape

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = json.load(open(os.path.join(ROOT, 'data', 'site.json'), encoding='utf-8'))
PAPERS = json.load(open(os.path.join(ROOT, 'data', 'papers.json'), encoding='utf-8'))
BASE = SITE['url'].rstrip('/')
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
{extra}<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/site.js" defer></script>
<script data-goatcounter="https://pedrofrackebrandt.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>'''.format(csp=CSP, title=escape(title), desc=escape(desc), canonical=canonical, base=BASE, extra=extra)


def footer():
    e = SITE['email']
    return '''  <footer class="foot" id="contact">
    <span>&copy; {year} {name}</span>
    <a class="js-email" data-show href="#contact">{user} [at] {domain}</a>
  </footer>'''.format(year=YEAR, name=escape(SITE['name']), user=e['user'], domain=e['domain'])


def featured_card(p):
    parts = ['<article class="paper">',
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
    chips = ['<button class="chip" type="button" data-topic="" aria-pressed="true">All<span class="n">%d</span></button>' % len(papers)]
    for t in topics:
        n = sum(1 for p in papers if p['topic'] == t)
        chips.append('<button class="chip" type="button" data-topic="%s" aria-pressed="false">%s<span class="n">%d</span></button>'
                     % (escape(t), escape(t), n))
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
    <div class="index-head">
      <h3 class="label">All papers</h3>
      <div class="chips" role="group" aria-label="Filter papers by topic">{chips}</div>
    </div>
{groups}
    <button class="btn show-all" type="button" hidden>Show all</button>
  </div>'''.format(limit=SITE.get('list_collapsed', 10), chips=''.join(chips), groups='\n'.join(groups))


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
    person = json.dumps({"@context": "https://schema.org", "@type": "Person", "name": SITE['name'], "url": BASE + '/',
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
  <nav class="tabs" role="tablist" aria-label="Sections">
    <a class="tab" role="tab" id="tab-research" href="#research" aria-controls="research" aria-selected="true">Research<span class="count">{np}</span></a>
    <a class="tab" role="tab" id="tab-tools" href="#tools" aria-controls="tools" aria-selected="false" tabindex="-1">Tools<span class="count">{nt}</span></a>
  </nav>

  <main id="main">
    <section class="panel" id="research" role="tabpanel" aria-labelledby="tab-research">
      <h2 class="vh">Research</h2>
      <div class="panel-head"><h3 class="label">Selected</h3><p class="kicker">{rk}</p></div>
      <div class="papers">
{cards}
      </div>
{index}
    </section>

    <section class="panel" id="tools" role="tabpanel" aria-labelledby="tab-tools">
      <h2 class="vh">Tools</h2>
      <div class="panel-head"><span></span><p class="kicker">{tk}</p></div>
      <div class="tools">
{tools}
      </div>
    </section>
  </main>

{footer}
</div>
</body>
</html>
'''.format(name=escape(SITE['name']), bio=bio, socials=''.join(socials), np=len(PAPERS), nt=len(SITE['tools']),
           rk=escape(SITE.get('research_kicker', '')), tk=escape(SITE.get('tools_kicker', '')),
           cards=cards, index=indent(index_list(PAPERS), 4), tools=tools, footer=footer())
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
    actions = []
    if links.get('pdf'):
        actions.append('<a class="btn" href="%s">PDF</a>' % escape(links['pdf']))
    else:
        actions.append('<a class="btn js-email" href="#contact">Draft on request</a>')
    for k, label in (('arxiv', 'arXiv'), ('code', 'Code'), ('data', 'Data')):
        if links.get(k):
            actions.append('<a class="btn" href="%s" rel="noopener noreferrer">%s</a>' % (escape(links[k]), label))
    fig = ''
    if p.get('figure'):
        fig = '    <div class="page-fig">\n%s\n    </div>\n' % indent(figure(p['figure']), 6)
    who = escape(SITE['name']) + ((', ' + byline(p)) if byline(p) else '')
    bib_id = 'bib-' + p['slug']
    html = head('%s · %s' % (p['title'], SITE['name']), p['summary'], canonical, '\n'.join(meta) + '\n') + '''
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="page-top"><a class="back" href="/#research">&larr; {name}</a></header>
  <main id="main">
  <article class="paper-page">
    <p class="eyebrow">{status} &middot; {year}</p>
    <h1>{title}</h1>
    <p class="authors">{who}</p>
{fig}    <div class="abstract">
{text}
    </div>
{help}
    <div class="paper-tags">{tags}</div>
    <div class="actions">{actions}</div>
    <details class="more">
      <summary>Cite</summary>
      <pre class="bib" id="{bib_id}">{bib}</pre>
      <button class="btn" type="button" data-copy="{bib_id}">Copy BibTeX</button>
    </details>
  </article>
  </main>
{footer}
</div>
</body>
</html>
'''.format(name=escape(SITE['name']), status=escape(p['status']), year=p['year'], title=escape(p['title']), who=who, fig=fig,
           text='\n'.join('      <p>%s</p>' % escape(x) for x in p['text']), help=indent(help_html(p), 4) if help_html(p) else '',
           tags=tags_html(p), actions=''.join(actions), bib_id=bib_id, bib=escape(bibtex(p)), footer=footer())
    return html


def main():
    slugs = [p['slug'] for p in PAPERS]
    assert len(slugs) == len(set(slugs)), 'duplicate slug'
    for p in PAPERS:
        for k in ('slug', 'title', 'year', 'status', 'topic', 'summary', 'text'):
            assert p.get(k), '%s is missing %s' % (p.get('slug'), k)
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(build_index())
    for p in PAPERS:
        d = os.path.join(ROOT, 'papers', p['slug'])
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(build_paper(p))
    urls = [BASE + '/'] + [BASE + url_of(p) for p in PAPERS]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % (
        '\n'.join('  <url><loc>%s</loc></url>' % u for u in urls))
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    print('built index.html, %d paper pages, sitemap.xml' % len(PAPERS))


if __name__ == '__main__':
    main()
