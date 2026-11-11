#!/usr/bin/env python3
"""Build rackebrandt.pe from data/*.json.

Edit data/papers.json, data/notes.json or data/site.json, run `python3 build.py`, commit everything.
Writes index.html, papers/<slug>/index.html, notes/index.html, notes/<slug>/index.html, <tool path>/index.html, sitemap.xml,
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
import unicodedata
from datetime import date
from html import escape, unescape

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = json.load(open(os.path.join(ROOT, 'data', 'site.json'), encoding='utf-8'))
PAPERS = json.load(open(os.path.join(ROOT, 'data', 'papers.json'), encoding='utf-8'))
NOTES_PATH = os.path.join(ROOT, 'data', 'notes.json')
NOTES = []        # loaded in main(): data/notes.json (local only, git ignores it) or its sealed copy data/notes.json.sealed
PASSWORD = None   # set in main() from NOTES_PASSWORD or .notes-password
BASE = SITE['url'].rstrip('/')
# Rikuy, Pedro's LaTeX editor, as published on claude.ai (it opens only for him). Notes listed in RIKUY_EDIT get
# an Edit in Rikuy button: it opens Rikuy in a new tab and downloads the note's project to drop on it.
RIKUY_APP = 'https://claude.ai/artifact/W7htGmmfauM4Z3KpjV9vzK'
RIKUY_EDIT = {'microeconomics-l3'}
VIEW = 'visual' if SITE.get('default_view') == 'visual' else 'list'   # how Research opens: 'list' or 'visual'
YEAR = date.today().year

ICONS = {n: open(os.path.join(ROOT, 'src', 'icons', n + '.svg'), encoding='utf-8').read().strip()
         for n in ('email', 'github', 'linkedin', 'x')}

# GoatCounter's versioned script never changes, so the browser checks it against this hash and refuses anything else.
# Version and hash from https://www.goatcounter.com/help/countjs-versions; a newer version needs both changed.
GOATCOUNTER_JS = 'https://gc.zgo.at/count.v5.js'
GOATCOUNTER_SRI = 'sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ'
# Scripts only from this site and that one GoatCounter file; no inline script anywhere.
CSP = ("default-src 'self'; script-src 'self' " + GOATCOUNTER_JS + "; style-src 'self'; "
       "img-src 'self' data: https://pedrofrackebrandt.goatcounter.com; "
       "connect-src 'self' https://pedrofrackebrandt.goatcounter.com; font-src 'self'; "
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


def full_text(p, mark=False):
    """A paper's summary paragraphs, the folded "more" ones included; a {"list": [...]} entry gives its items (lettered with mark)."""
    out = list(p['text'])
    for x in p.get('more', []):
        out += ['%s) %s' % (chr(65 + i), s) if mark else s for i, s in enumerate(x['list'])] if isinstance(x, dict) else [x]
    return out


def more_html(p):
    """The rest of a featured paper's summary, folded under Read more so the card stays short."""
    if not p.get('more'):
        return ''
    body = []
    for x in p['more']:
        if isinstance(x, dict):
            body.append('    <ol type="A">\n%s\n    </ol>' % '\n'.join('      <li>%s</li>' % escape(s) for s in x['list']))
        else:
            body.append('    <p>%s</p>' % escape(x))
    return ('<details class="read-more">\n  <summary><span class="rm-show">Read more</span><span class="rm-hide">Read less</span></summary>\n'
            '  <div class="read-more-body">\n%s\n  </div>\n</details>' % '\n'.join(body))


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
# math that appears only inside sealed notes is cached apart, in a file git ignores, so the public cache gives none of it away
MATH_PRIVATE = os.path.join(ROOT, 'data', 'math-cache-private.json.gz')
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
    s = re.sub(r'\$([^$\n]+?)\$([.,;:!?)]*)', lambda m: stash(
        '<span class="mp">%s\x06%s\x06</span>' % (math_token(m.group(1), False), escape(m.group(2))) if m.group(2) else math_token(m.group(1), False)), s)
    s = re.sub(r'`([^`]+)`', lambda m: stash('<code>%s</code>' % escape(m.group(1))), s)
    s = escape(s, quote=False)
    # colour roles from the Word notes: [term]{.key} red key term, [Label.]{.label} purple sub label, [Question?]{.ask} green prompt
    s = re.sub(r'\[([^\[\]]+)\]\{\.(key|label|ask)\}', lambda m: '<span class="c-%s">%s</span>' % (m.group(2), m.group(1)), s)
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


BOX_LABELS = {'short': 'In short', 'intuition': 'Intuition', 'note': 'Note!', 'takeaway': 'Takeaway!'}
FIG_SLOT = '\x04FIGURE\x04'


# ::: name  (a box), or  ::: try <figure>  (a guided exercise on that figure); a line ::: closes it.
# ::: proof <title>  folds a proof away on the page (open it to read), ::: example <title>  is a worked example,
# ::: check  holds ask: and answer: lines, questions to test yourself with the answers hidden
BOX_RE = re.compile(r'^:::[ \t]*(\w+)(?:[ \t]+([^\n]*?))?[ \t]*\n(.*?)\n:::[ \t]*$', re.M | re.S)

# A guided exercise ("Try it") turns a figure into steps. Inside  ::: try <figure>  each line starts with a field:
#   eq:      live equation shown above the steps (TeX; \nv{key}{0.00} is a number the figure keeps current)
#   step:    starts a step, with its title
#   ask:     the question to answer before touching the figure (green, Pedro's question colour)
#   answer:  its answer, behind a Show answer button
#   do:      what to do in the figure
#   set:     key=value pairs a Set it up button gives the figure (n=10 pop=exp)
#   goal:    when the step counts as done, from the figure's state (misses>=4 and pop=exp)
#   notice:  what to see, shown once the goal is met or on request
#   eq:      inside a step, a live equation for that step
# A line with no field continues the field above it. The figure supplies get/set/on through NF.api (assets/notes.js).
TRY_FIELDS = ('eq', 'step', 'ask', 'answer', 'do', 'set', 'goal', 'notice')
TRY_COND = re.compile(r'^\s*([a-z][a-z0-9]*)\s*(==|!=|<=|>=|<|>|=)\s*([\w.+-]+)\s*$')


def parse_try(name, inner):
    top, steps, cur, last = {'eq': []}, [], None, None
    for line in inner.split('\n'):
        if not line.strip():
            continue
        m = re.match(r'^\s*(%s):\s?(.*)$' % '|'.join(TRY_FIELDS), line)
        if not m:
            if last is None:
                raise SystemExit('::: try %s: a line before any field: %r' % (name, line))
            last[0][last[1]] = (last[0][last[1]] + ' ' + line.strip()) if last[1] != 'eq' else last[0][last[1]]
            if last[1] == 'eq':
                last[0]['eq'][-1] += ' ' + line.strip()
            continue
        key, val = m.group(1), m.group(2).strip()
        if key == 'step':
            cur = {'title': val, 'eq': []}
            steps.append(cur)
            last = (cur, 'title')
            continue
        target = cur if cur is not None else top
        if cur is None and key != 'eq':
            raise SystemExit('::: try %s: %s: comes before the first step:' % (name, key))
        if key == 'eq':
            target['eq'].append(val)
            last = (target, 'eq')
        else:
            if key in target:
                raise SystemExit('::: try %s: step %r has two %s: lines' % (name, cur['title'], key))
            target[key] = val
            last = (target, key)
    if not steps:
        raise SystemExit('::: try %s: no step:' % name)
    for st in steps:
        for part in re.split(r'\s+and\s+', st.get('goal', '')) if st.get('goal') else []:
            if not TRY_COND.match(part):
                raise SystemExit('::: try %s: goal %r: write key op value, joined by and (ops == != < <= > >=)' % (name, st['goal']))
        for part in st.get('set', '').split():
            if not re.fullmatch(r'[a-z][a-z0-9]*=[\w.+-]+', part):
                raise SystemExit('::: try %s: set %r: write key=value pairs separated by spaces' % (name, st['set']))
        if 'ask' in st and 'answer' not in st:
            raise SystemExit('::: try %s: step %r asks without an answer:' % (name, st['title']))
    return top, steps


def try_html(name, inner):
    top, steps = parse_try(name, inner)
    m = re.search(r'data-nfig="([^"]+)"', figure(name))
    if not m:
        raise SystemExit('::: try %s: no figure with that name in src/figures' % name)
    eqs = lambda lst: ''.join('<div class="eq nf-live">%s</div>' % math_token(t, True) for t in lst)
    out = ['<div class="nf-try" data-for="%s">' % m.group(1),
           '<div class="nf-try-head"><p class="nf-try-title">Try it</p><p class="nf-try-count">%d steps</p></div>' % len(steps),
           eqs(top['eq']), '<ol class="nf-steps">']
    for i, st in enumerate(steps):
        attrs = ''.join(' data-%s="%s"' % (k, escape(st[k])) for k in ('set', 'goal') if st.get(k))
        li = ['<li class="nf-step"%s>' % attrs, '<p class="nf-step-title"><span class="nf-step-n">Step %d.</span> %s</p>' % (i + 1, md_inline(st['title']))]
        if st.get('ask'):
            li.append('<p class="nf-ask">%s</p>' % md_inline(st['ask']))
            li.append('<button class="nf-reveal" type="button" aria-expanded="false">Show answer</button><div class="nf-answer" hidden>%s</div>' % md_html(st['answer']))
        if st.get('do'):
            li.append('<p class="nf-do">%s</p>' % md_inline(st['do']))
        if st.get('set') or st.get('goal'):
            li.append('<p class="nf-act">%s<span class="nf-status" aria-live="polite"></span></p>'
                      % ('<button class="nf-setup" type="button">Set it up</button>' if st.get('set') else ''))
        li.append(eqs(st['eq']))
        if st.get('notice'):
            li.append('<button class="nf-reveal nf-reveal-notice" type="button" aria-expanded="false">What to notice</button><div class="nf-notice" hidden>%s</div>' % md_html(st['notice']))
        li.append('</li>')
        out.append(''.join(li))
    out.append('</ol></div>')
    return ''.join(out)


def try_tex(name, inner):
    top, steps = parse_try(name, inner)
    body = [('\\[\n%s\n\\]' % t) for t in top['eq']]
    for i, st in enumerate(steps):
        part = ['\\trystep{Step %d. %s}' % (i + 1, tex_inline(st['title']))]
        if st.get('ask'):
            part.append('\\askq{%s}' % tex_inline(st['ask']))
        if st.get('do'):
            part.append('\\textit{Do:} %s' % tex_inline(st['do']))
        part += ['\\[\n%s\n\\]' % t for t in st['eq']]
        if st.get('answer'):
            part.append('\\textit{Answer:} %s' % tex_inline(st['answer']))
        if st.get('notice'):
            part.append('\\textit{What you see:} %s' % tex_inline(st['notice']))
        body.append('\n\n'.join(part))
    return '\\begin{trybox}\n%s\n\\end{trybox}' % '\n\n'.join(body)


def parse_check(inner):
    """The ask: / answer: pairs of a ::: check box; a line with no field continues the one above."""
    pairs, last = [], None
    for line in inner.split('\n'):
        if not line.strip():
            continue
        m = re.match(r'^\s*(ask|answer):\s?(.*)$', line)
        if m and m.group(1) == 'ask':
            pairs.append([m.group(2).strip(), ''])
            last = 0
        elif m:
            if not pairs or pairs[-1][1]:
                raise SystemExit('::: check: answer: without its ask: %r' % line)
            pairs[-1][1] = m.group(2).strip()
            last = 1
        elif last is not None:
            pairs[-1][last] += ' ' + line.strip()
        else:
            raise SystemExit('::: check: a line before the first ask: %r' % line)
    if not pairs or any(not a for _, a in pairs):
        raise SystemExit('::: check: every ask: needs an answer:')
    return pairs


def md_html(src):
    raw = []

    def fence(m):
        kind, name, inner = m.group(1), m.group(2), m.group(3)
        if kind == 'try':
            raw.append(try_html(name, inner))
            return '\n\n\x03%d\x03\n\n' % (len(raw) - 1)
        if kind == 'proof':
            raw.append('<details class="box proof"><summary><span class="box-label">Proof</span>%s</summary><div class="proof-body">%s</div></details>'
                       % ((' <span class="proof-title">%s</span>' % md_inline(name)) if name else '', md_html(inner)))
            return '\n\n\x03%d\x03\n\n' % (len(raw) - 1)
        if kind == 'example':
            raw.append('<div class="box example"><p class="box-label">Example%s</p>%s</div>' % ((': ' + md_inline(name)) if name else '', md_html(inner)))
            return '\n\n\x03%d\x03\n\n' % (len(raw) - 1)
        if kind == 'check':
            qs = ''.join('<li><p class="nf-ask">%s</p><button class="chk-reveal" type="button" aria-expanded="false">Show answer</button>'
                         '<div class="chk-answer" hidden>%s</div></li>' % (md_inline(q), md_html(a)) for q, a in parse_check(inner))
            raw.append('<div class="box check"><p class="box-label">Check yourself</p><ol class="chk">%s</ol></div>' % qs)
            return '\n\n\x03%d\x03\n\n' % (len(raw) - 1)
        label = BOX_LABELS.get(kind, '')
        raw.append('<div class="box %s">%s%s</div>' % (kind, '<p class="box-label">%s</p>' % label if label else '', md_html(inner)))
        return '\n\n\x03%d\x03\n\n' % (len(raw) - 1)

    src = re.sub(BOX_RE, fence, src.replace('\r', ''))
    src = re.sub(r'\$\$(!?)(.+?)\$\$', lambda m: '\n\n$$%s%s$$\n\n' % (m.group(1), m.group(2)), src, flags=re.S)
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
        elif block.strip().startswith('$$!'):
            # $$! ... $$ is a key result, set in the Word notes' blue
            out.append('<div class="eq eq-key">%s</div>' % math_token(block.strip()[3:-2], True))
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
    """A paper page's text. It is private like the notes: content/<slug>.md stays local (git ignores it) and the repo
    keeps content/<slug>.md.sealed, which the build opens with the password."""
    f = os.path.join(ROOT, 'content', p['slug'] + '.md')
    sealed = f + '.sealed'
    if os.path.exists(f):
        text = open(f, encoding='utf-8').read()
        if PASSWORD:
            box = {k: v for k, v in seal('seal', [{'id': 'src/papers/' + p['slug'], 'text': text}])[0].items() if k != 'id'}
            old = json.load(open(sealed, encoding='utf-8')) if os.path.exists(sealed) else None
            if box != old:
                json.dump(box, open(sealed, 'w', encoding='utf-8'), indent=0)
        return text
    if os.path.exists(sealed) and PASSWORD:
        return seal('open', [dict(json.load(open(sealed, encoding='utf-8')), id='src/papers/' + p['slug'])])[0]['text']
    return ''


def resolve_math(pages):
    """Swap math tokens for KaTeX HTML. Inline styles become classes in assets/math.css (the CSP blocks style attributes)."""
    def load(path):
        return json.loads(gzip.decompress(open(path, 'rb').read())) if os.path.exists(path) else {}

    def save(path, data, old):
        if data != old:
            with open(path, 'wb') as fh, gzip.GzipFile(fileobj=fh, mode='wb', mtime=0, filename='') as gz:
                gz.write(json.dumps(data, ensure_ascii=False, indent=0, sort_keys=True).encode('utf-8'))

    disk, disk_private = load(MATH_PATH), load(MATH_PRIVATE)
    cache = {**disk_private, **disk}
    keys = [('D ' if d else 'I ') + t for t, d in MATH_JOBS]
    # a formula is public when some page shows it outside a sealed region
    public = set()
    for html in pages.values():
        for i in re.findall('\x00M(\\d+)\x00', SEAL_RE.sub('', html)):
            public.add(keys[int(i)])
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
    save(MATH_PATH, {k: v for k, v in used.items() if k in public}, disk)
    # without the password the note pages are not rebuilt, so their math looks unused; keep its cache
    if PASSWORD:
        save(MATH_PRIVATE, {k: v for k, v in used.items() if k not in public}, disk_private)
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
    # punctuation after inline math goes inside the formula's last box, so a line can never break between them
    # (a nowrap wrapper is not enough: browsers may break after an inline block whatever the parent says)
    out = {path: re.sub('(</span></span></span>)\x06([^\x06]*)\x06', r'<span class="mp-p">\2</span>\1', html) for path, html in out.items()}
    rules = ''.join('.%s{%s}\n' % (n, ';'.join(d.strip() + '!important' for d in styles[n].split(';') if d.strip())) for n in sorted(styles))
    css = os.path.join(ROOT, 'assets', 'math.css')
    if not PASSWORD and os.path.exists(LOCK_PATH) and os.path.exists(css):
        # the sealed note pages, left as they are without the password, still need their classes: keep the old rules too
        # (a class name is a hash of its rule, so a line means the same thing in both)
        rules = ''.join(sorted(set(rules.splitlines(True)) | set(l for l in open(css, encoding='utf-8') if l.startswith('.k'))))
    with open(css, 'w', encoding='utf-8') as fh:
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
<script data-goatcounter="https://pedrofrackebrandt.goatcounter.com/count" async src="{gc}" crossorigin="anonymous" integrity="{gc_sri}"></script>
</head>'''.format(csp=CSP, title=escape(title), desc=escape(desc), canonical=canonical, base=BASE, extra=extra,
           vcss=version('assets/site.css'), vjs=version('assets/site.js'), gc=GOATCOUNTER_JS, gc_sri=GOATCOUNTER_SRI)


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
    if more_html(p):
        parts.append(indent(more_html(p), 4))
    if help_html(p):
        parts.append(indent(help_html(p), 4))
    parts.append('    <div class="paper-tags">%s<a class="go" href="%s">Paper page &rarr;</a></div>' % (tags_html(p), url_of(p)))
    parts += ['  </div>', '</article>']
    return '\n'.join(parts)


def tool_url(t):
    """A tool's address, only if it is a plain https one: it goes into an href and a refresh, where another scheme
    (javascript:, data:) would run or load what the page's policy is there to keep out."""
    u = t.get('url') or ''
    return u if re.fullmatch(r'https://[A-Za-z0-9.-]+(/[^\s"<>\\]*)?', u) else ''


# folders of the site itself: a tool's forwarding page may not take one of their names
RESERVED = {'assets', 'content', 'data', 'notes', 'papers', 'src', 'tools'}


def tool_card(t):
    """A tool, laid out as a paper is: its mark on the left where a paper has its figure, then its name, what it
    is and whether it is out yet. One with a `url` is linked from the mark, the name and an Open link (a new tab);
    one with no `icon` shows its initial in the mark's place."""
    name = escape(t['name'])
    url = escape(tool_url(t), quote=True)
    link = ' href="%s" target="_blank" rel="noopener"' % url
    if t.get('icon') and re.fullmatch(r'/assets/[A-Za-z0-9_./-]+\.(png|svg|jpg|webp)', t['icon']) and '..' not in t['icon']:
        mark = '<img src="%s" alt="" width="132" height="132" loading="lazy" decoding="async">' % escape(t['icon'], quote=True)
    else:
        mark = '<span class="tool-initial">%s</span>' % escape(t['name'][:1])
    # the mark repeats the name's link, so it stays out of the tab order and of a screen reader's list
    fig = ('<a class="tool-fig"%s tabindex="-1" aria-hidden="true">%s</a>' % (link, mark)) if url else '<div class="tool-fig" aria-hidden="true">%s</div>' % mark
    title = ('<a%s>%s</a>' % (link, name)) if url else name
    tags = []
    if t.get('status'):
        tags.append('<span class="tag%s">%s</span>' % (' live' if url else '', escape(t['status'])))
    tags += ['<span class="tag">%s</span>' % escape(x) for x in t.get('tags', [])]
    if url:
        tags.append('<a class="go"%s>Open %s &rarr;</a>' % (link, name))
    row = ('\n            <div class="paper-tags">%s</div>' % ''.join(tags)) if tags else ''
    return '''        <article class="tool">
          <div class="tool-head"><h3>%s</h3></div>
          %s
          <div class="tool-body">
            <p>%s</p>%s
          </div>
        </article>''' % (title, fig, escape(t['text']), row)


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

def course_slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def courses():
    """The notes grouped by course, in the order courses first appear; lecturers and term come from the notes' entries."""
    out = []
    for n in NOTES:
        c = next((x for x in out if x['name'] == n['course']), None)
        if c is None:
            c = {'name': n['course'], 'slug': course_slug(n['course']), 'notes': [], 'who': [], 'term': n.get('term', '')}
            out.append(c)
        c['notes'].append(n)
        if n.get('lecturer') and n['lecturer'] not in c['who']:
            c['who'].append(n['lecturer'])
    return out


def courses_html(root, prefix):
    """Course cards, and for each course a view of its lectures. The views open in place from the URL hash
    (prefix + course slug), so the back button and links work; assets/site.js initCourses does the switching."""
    cards, views = [], []
    for c in courses():
        k = len(c['notes'])
        meta = ' &middot; '.join(x for x in (escape(c['term']), '%d lecture%s' % (k, '' if k == 1 else 's')) if x)
        who = escape(' and '.join(c['who']))
        chips = ''.join('<li><a href="%s" title="%s">%s</a></li>' % (note_url(n), escape(n['title']), escape(n['label'])) for n in c['notes'])
        cards.append("""        <div class="tool course-card">
          <p class="eyebrow">{meta}</p>
          <h3><a href="{href}">{name}</a></h3>{who}
          <ol class="course-chips" aria-label="Lectures">{chips}</ol>
          <a class="go" href="{href}">Open the course &rarr;</a>
        </div>""".format(meta=meta, href=prefix + c['slug'], name=escape(c['name']), chips=chips,
                         who=('\n          <p class="course-who">%s</p>' % who) if who else ''))
        # inside a course the course name is already the heading, so each card is labelled by its lecture alone
        notes = '\n'.join(NOTE_CARD.format(tag=escape(n['label']), url=note_url(n), title=escape(n['title']), summary=escape(n['summary']))
                          for n in c['notes'])
        views.append("""      <section class="course-view" data-course-view="{slug}" hidden>
        <div class="course-head">
          <a class="course-back" href="{root}">&larr; All courses</a>
          <h3>{name}</h3>{meta}
        </div>
        <div class="tools">
{notes}
        </div>
      </section>""".format(slug=c['slug'], root=root, name=escape(c['name']), notes=notes,
                           meta=('\n          <p class="course-meta">%s</p>' % ' &middot; '.join(x for x in (who, escape(c['term'])) if x)) if (who or c['term']) else ''))
    return '<div class="courses" data-courses>\n      <div class="tools course-grid">\n%s\n      </div>\n%s\n    </div>' % ('\n'.join(cards), '\n'.join(views))


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
    tools = '\n'.join(tool_card(t) for t in SITE['tools'])
    notes_tab = notes_panel = owns = ''
    if NOTES or LOCK.get('home'):
        # the Notes tab sits at the right end of the tab row, after the List or Visual switch; aria-owns keeps it in the tablist
        owns = ' aria-owns="tab-notes"'
        notes_tab = ('\n    <a class="tab tab-notes" role="tab" id="tab-notes" href="#notes" aria-controls="notes" aria-selected="false" tabindex="-1">'
                     'Notes<span class="count tab-lock" data-locked>%s</span></a>' % LOCK_GLYPH)
        notes_panel = NOTE_PANEL % sealed_block('home', '      ' + courses_html('#notes', '#notes/'), indent_by=6)
    topics = []
    for p in PAPERS:
        for t in [p['topic']] + list(p.get('tags', [])):
            if t not in topics:
                topics.append(t)
    person = json.dumps({"@context": "https://schema.org", "@type": "Person", "name": SITE['name'], "url": BASE + '/',
                         "description": SITE['description'], "knowsAbout": topics,
                         "subjectOf": [{"@type": "ScholarlyArticle", "name": p['title'], "url": BASE + url_of(p)} for p in PAPERS],
                         "affiliation": {"@type": "CollegeOrUniversity", "name": "Merton College, University of Oxford"},
                         "sameAs": [s['url'] for s in SITE['socials']]}).replace('<', '\\u003c')
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
{tk}      <div class="tools">
{tools}
      </div>
    </section>{notes_panel}
  </main>

</div>
</body>
</html>
'''.format(name=escape(SITE['name']), bio=bio, socials=''.join(socials), np=len(PAPERS), nt=len(SITE['tools']),
           view=VIEW, list_on='true' if VIEW == 'list' else 'false', visual_on='true' if VIEW == 'visual' else 'false',
           tk=('      <div class="panel-head"><span></span><p class="kicker">%s</p></div>\n' % escape(SITE['tools_kicker'])) if SITE.get('tools_kicker') else '',
           cards=cards, index=indent(index_list(PAPERS), 4), tools=tools, notes_tab=notes_tab, notes_panel=notes_panel, owns=owns)
    return html


def build_paper(p):
    """A paper's own page sits behind the notes password: the page ships only the back link and the lock, and
    assets/site.js opens the sealed article. The home page card stays public."""
    canonical = BASE + url_of(p)
    links = p.get('links', {})
    meta = ['<meta name="robots" content="noindex, nofollow">']
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
    body = md_html(explainer(p)) or '\n'.join('<p>%s</p>' % escape(x) for x in full_text(p, True))
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
    article = """<article class="paper-page">
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
  </article>""".format(status=escape(p['status']), year=p['year'], title=escape(p['title']), who=who,
           lede=escape(p['summary']), actions='<span aria-hidden="true">&middot;</span>'.join(actions),
           lead=indent(lead, 4), fig=indent(fig, 4), body=indent(post.strip(), 6), tags=tags_html(p), bib_id=bib_id, bib=escape(bibtex(p)))
    return head('%s · %s' % (p['title'], SITE['name']), p['summary'], canonical, extra) + """
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="page-top"><a class="back" href="/#research">&larr; {name}</a></header>
  <main id="main">
{article}
  </main>
</div>
</body>
</html>
""".format(name=escape(SITE['name']), article=sealed_block(url_of(p).strip('/'), article, 2))


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
    # SEAL_RE only finds ids made of these characters; any other id would leave the span unsealed, so stop here
    assert re.fullmatch(r'[\w/.-]+', sid), 'seal id %r: use letters, digits, _ / . - only' % sid
    return indent('\x05S%s\x05%s\x05E\x05' % (sid, html), indent_by)


LOCK_HTML = """<div class="locked" data-lock>
  <div class="lockbox">
    <svg class="lock-icon" viewBox="0 0 32 40" aria-hidden="true"><path class="lock-shackle" d="M9 18v-6a7 7 0 0 1 14 0v6"/><rect class="lock-body" x="4" y="18" width="24" height="19" rx="3.5"/><path class="lock-hole" d="M16 25.5v4"/></svg>
    <form class="lock-form" novalidate>
      <label class="lock-field"><span class="vh">Password</span><input type="password" name="password" autocomplete="current-password" placeholder="Password" spellcheck="false"></label>
      <button class="lock-go" type="submit" aria-label="Open"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5"/></svg></button>
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
    out = {path: SEAL_RE.sub(swap, html) for path, html in pages.items()}
    for path, html in out.items():
        assert '\x05' not in html, '%s: a sealed region was not sealed' % path
    return out


def note_head(title, desc, canonical, body):
    extra = '<meta name="robots" content="noindex, nofollow">\n'
    extra += math_links() if '\x00M' in body else ''
    if 'data-nfig' in body:
        extra += ('<link rel="stylesheet" href="/assets/notes.css?v=%s">\n<script src="/assets/notes.js?v=%s" defer></script>\n'
                  % (version('assets/notes.css'), version('assets/notes.js')))
        extra += ''.join('<link rel="stylesheet" href="/assets/figs/%s?v=%s">\n' % (f, version('assets/figs/' + f)) for f in fig_files('.css'))
        extra += ''.join('<script src="/assets/figs/%s?v=%s" defer></script>\n' % (f, version('assets/figs/' + f)) for f in fig_files('.js'))
    return head(title, desc, canonical, extra)


def fig_files(ext):
    """Each lecture's own figures: assets/figs/<lecture>.js registers them with NF.register, <lecture>.css styles them."""
    d = os.path.join(ROOT, 'assets', 'figs')
    return sorted(f for f in os.listdir(d) if f.endswith(ext)) if os.path.isdir(d) else []


def toc_items(body):
    return ''.join('<li><a href="#%s">%s</a></li>' % (m.group(1), m.group(2))
                   for m in re.finditer(r'<h2 id="([^"]+)">(.*?)</h2>', body))


def fold_sections(body):
    """Each top level section of a note folds: its h2 becomes the summary of an open <details>, with a chevron on the left."""
    parts = re.split(r'(?m)^(?=<h2 id=")', body)
    out = [parts[0]]
    for part in parts[1:]:
        head, _, rest = part.partition('\n')
        out.append('<details class="nsec" open><summary>%s</summary><div class="nsec-body">\n%s</div></details>\n' % (head, rest))
    return ''.join(out)


def rikuy_edit(n):
    if n['slug'] not in RIKUY_EDIT:
        return {'edit': '', 'edit_help': ''}
    return {'edit': '<span aria-hidden="true">&middot;</span><button class="linkbtn rikuy-edit" type="button" data-rikuy="%s" data-open="%s">Edit in Rikuy</button>'
                    % (note_url(n) + 'rikuy.sealed', RIKUY_APP),
            'edit_help': '\n      <p class="rikuy-help" hidden>Rikuy is open in a new tab and this note has downloaded as a zip. Drop the zip '
                         'on Rikuy\'s page (or press Open there), then type on the page as you read. Rikuy keeps your copy in this '
                         'browser; Save .zip and PDF download it.</p>'}


def build_note(n):
    canonical = BASE + note_url(n)
    body = fold_sections(md_html(note_source(n)))
    toc = toc_items(body)
    course = [m for m in NOTES if m['course'] == n['course']]
    others = ''
    if len(course) > 1:
        others = '\n      <details class="toc-group">\n        <summary class="toc-label">%s</summary>\n        <ol class="toc-list">%s</ol>\n      </details>' % (escape(n['course']), ''.join(
            '<li><a href="%s"%s>%s %s</a></li>' % (note_url(m), ' aria-current="page"' if m is n else '', escape(m['label']), escape(m['title']))
            for m in course))
    article = """<article class="paper-page note-page">
    <header class="paper-header">
      <p class="eyebrow">{tag}</p>
      <h1>{title}</h1>
      <p class="lede">{lede}</p>
      <p class="page-actions"><a href="/#notes/{course}">All lectures</a><span aria-hidden="true">&middot;</span><button class="linkbtn rikuy-dl" type="button" data-rikuy="{dl}">Download for Rikuy</button>{edit}</p>{edit_help}
    </header>
    <nav class="toc toc-wide" aria-label="On this page">
      <details class="toc-group" open>
        <summary class="toc-label">On this page</summary>
        <ol class="toc-list">{toc}</ol>
      </details>{others}
    </nav>
    <details class="toc toc-narrow">
      <summary>On this page</summary>
      <ol class="toc-list">{toc}</ol>
    </details>
    <div class="explainer">
{body}
    </div>
  </article>""".format(tag=note_tag(n), title=escape(n['title']), lede=escape(n['summary']), toc=toc, others=others, body=indent(body, 6), course=course_slug(n['course']),
           dl=note_url(n) + 'rikuy.sealed', **rikuy_edit(n))
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
    listing = """<div class="notes-index">
  <header class="paper-header">
    <p class="eyebrow">{kicker}</p>
    <h1>Notes</h1>
    <p class="lede">Lecture notes written to be read with the figures: move the sliders and watch the result.</p>
  </header>
  {groups}
</div>""".format(kicker=escape(SITE.get('notes_kicker', '')), groups=courses_html('/notes/', '#'))
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


# ---------------------------------------------------------------------------
# Rikuy export. Each note also becomes a LaTeX project for Rikuy (Pedro's LaTeX editor): main.tex from the same
# Markdown, rikuy.sty, every figure as a standalone widget (widgets/<name>.html, live in Rikuy) and as a picture
# (figures/<name>.png, what any TeX compile prints). The zip is sealed like the note and downloaded from its page.
# Pictures come from tools/figshots.py (Playwright), cached in data/figshots/ by the widget's hash.

TEX_UNICODE = {'\u2212': '\\ensuremath{-}', '\u00d7': '\\ensuremath{\\times}', '\u2264': '\\ensuremath{\\le}', '\u2265': '\\ensuremath{\\ge}',
               '\u2260': '\\ensuremath{\\ne}', '\u2192': '\\ensuremath{\\to}', '\u21d2': '\\ensuremath{\\Rightarrow}', '\u2248': '\\ensuremath{\\approx}',
               '\u221e': '\\ensuremath{\\infty}', '\u00b1': '\\ensuremath{\\pm}', '\u2026': '\\ldots{}', '\u2014': '---', '\u2013': '--',
               '\u00b7': '\\ensuremath{\\cdot}', '\u2032': "\\ensuremath{'}", '\u221a': '\\ensuremath{\\surd}', '\u2016': '\\ensuremath{\\|}',
               '\u03b5': '\\ensuremath{\\varepsilon}', '\u2009': '\\,', '\u00a0': '~', '\u2223': '\\ensuremath{\\mid}',
               '\u22a5': '\\ensuremath{\\perp}', '\u2208': '\\ensuremath{\\in}', '\u2211': '\\ensuremath{\\sum}', '\u2245': '\\ensuremath{\\cong}',
               '\u2286': '\\ensuremath{\\subseteq}', '\u2229': '\\ensuremath{\\cap}', '\u222a': '\\ensuremath{\\cup}', '\u2205': '\\ensuremath{\\emptyset}',
               '\u21a6': '\\ensuremath{\\mapsto}', '\u2202': '\\ensuremath{\\partial}', '\u2207': '\\ensuremath{\\nabla}', '\u2261': '\\ensuremath{\\equiv}'}
TEX_SPECIAL = {'\\': '\\textbackslash{}', '&': '\\&', '%': '\\%', '#': '\\#', '_': '\\_', '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}'}
# figure captions write symbols as plain Unicode (they are also the web caption); pdflatex knows only Latin 1 and a few
# more, so superscripts, subscripts, Greek letters and accented symbols become math here
TEX_SUP = dict(zip('\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207b\u207a\u207f\u1d40', '0123456789-+nT'))
TEX_SUB = dict(zip('\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089\u1d62\u2c7c\u2099\u2096\u209c', '0123456789ijnkt'))
TEX_ACCENT = {'\u0302': 'hat', '\u0304': 'bar', '\u0305': 'bar', '\u0303': 'tilde', '\u0307': 'dot', '\u0308': 'ddot', '\u030c': 'check',
              '\u0301': 'acute', '\u0300': 'grave'}
TEX_GREEK_CAPS = ('gamma', 'delta', 'theta', 'lambda', 'xi', 'pi', 'sigma', 'upsilon', 'phi', 'psi', 'omega')


def tex_greek(ch):
    """A Greek letter as a math command (without $), or None."""
    m = re.match(r'GREEK (SMALL|CAPITAL) LETTER ([A-Z]+)$', unicodedata.name(ch, ''))
    if not m:
        return None
    w = {'lamda': 'lambda', 'epsilon': 'varepsilon', 'omicron': 'o'}.get(m.group(2).lower(), m.group(2).lower())
    if m.group(1) == 'CAPITAL':
        return '\\' + w.capitalize() if w in TEX_GREEK_CAPS else dict(
            alpha='A', beta='B', varepsilon='E', zeta='Z', eta='H', iota='I', kappa='K', mu='M', nu='N', o='O', rho='P', tau='T', chi='X').get(w)
    return w if w == 'o' else '\\' + w


def tex_text(s):
    s, out, i = unicodedata.normalize('NFC', s), [], 0
    while i < len(s):
        ch = s[i]
        for table, mark in ((TEX_SUP, '^'), (TEX_SUB, '_')):
            if ch in table:
                j = i
                while j < len(s) and s[j] in table:
                    j += 1
                out.append('\\ensuremath{%s{%s}}' % (mark, ''.join(table[c] for c in s[i:j])))
                i = j
                break
        else:
            j = i + 1
            while j < len(s) and unicodedata.combining(s[j]):
                j += 1
            parts = unicodedata.normalize('NFD', s[i:j])
            if (j > i + 1 or ord(ch) > 0xff) and len(parts) > 1 and all(c in TEX_ACCENT for c in parts[1:]):
                base = tex_greek(parts[0]) or parts[0]
                for c in parts[1:]:
                    base = '\\%s{%s}' % (TEX_ACCENT[c], base)
                out.append('\\ensuremath{%s}' % base)
            elif ch in TEX_SPECIAL or ch in TEX_UNICODE:
                out.append(TEX_SPECIAL.get(ch) or TEX_UNICODE[ch])
            elif tex_greek(ch):
                g = tex_greek(ch)
                out.append('\\ensuremath{%s}' % g if g.startswith('\\') else g)
            elif ord(ch) <= 0xff or ch in '\u2018\u2019\u201c\u201d':
                out.append(ch)
            else:
                plain = unicodedata.normalize('NFKD', ch).encode('ascii', 'ignore').decode()
                print('warning: no LaTeX for %r (U+%04X), writing %r' % (ch, ord(ch), plain))
                out.append(tex_text(plain))
            i = j
    return ''.join(out)


def tex_inline(s):
    keep = []

    def stash(t):
        keep.append(t)
        return '\x01%d\x01' % (len(keep) - 1)

    s = s.replace('\\$', stash('\\$'))
    s = re.sub(r'\$([^$\n]+?)\$', lambda m: stash('$%s$' % m.group(1).strip()), s)
    s = re.sub(r'`([^`]+)`', lambda m: stash('\\texttt{%s}' % tex_text(m.group(1))), s)
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: stash('\\href{%s}{%s}' % (
        (BASE + m.group(2) if m.group(2).startswith('/') else m.group(2)).replace('%', '\\%').replace('#', '\\#'), tex_inline(m.group(1)))), s)
    s = tex_text(s)
    s = re.sub(r'"([^"\n]+)"', r"``\1''", s)   # straight quotes as TeX's opening and closing quotes
    s = re.sub(r'\[([^\[\]]+)\]\\\{\.(key|label|ask)\\\}', lambda m: '\\%s{%s}' % (
        {'key': 'keyterm', 'label': 'sublabel', 'ask': 'askq'}[m.group(2)], m.group(1)), s)
    s = re.sub(r'\*\*(.+?)\*\*', r'\\textbf{\1}', s)
    s = re.sub(r'(?<![*\w])\*(?![\s*])(.+?)(?<![\s*])\*(?![*\w])', r'\\emph{\1}', s)
    return re.sub('\x01(\\d+)\x01', lambda m: keep[int(m.group(1))], s)


def tex_items(lines, marker):
    items = []
    for line in lines:
        m = marker.match(line)
        if m:
            items.append(line[m.end():])
        elif items:
            items[-1] += ' ' + line.strip()
    return ''.join('  \\item %s\n' % tex_inline(i) for i in items)


def tex_table(lines):
    rows = [[c.strip() for c in l.strip().strip('|').split('|')] for l in lines if not re.match(r'^\|?[\s:|-]+\|?$', l)]
    n = max(len(r) for r in rows)
    spec = '@{}' + '>{\\raggedright\\arraybackslash}X' * n + '@{}'
    head_row = ' & '.join('\\textbf{%s}' % tex_inline(c) for c in rows[0])
    body = ''.join(' & '.join(tex_inline(c) for c in r) + ' \\\\\n' for r in rows[1:])
    return ('\\begin{center}%s\n\\begin{tabularx}{\\linewidth}{%s}\n\\toprule\n%s \\\\\n\\midrule\n%s\\bottomrule\n\\end{tabularx}\n\\end{center}'
            % ('\\footnotesize' if n >= 5 else '\\small', spec, head_row, body))


def figure_caption(name):
    m = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', figure(name), re.S)
    return unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip() if m else ''


def md_tex(src, figs):
    """The note's Markdown as a LaTeX body; figs collects the figure names in order."""
    raw = []
    box_env = {'short': 'shortbox', 'intuition': 'intuitionbox', 'note': 'notebox', 'takeaway': 'takeawaybox'}

    def fence(m):
        kind, name, inner = m.group(1), m.group(2), m.group(3)
        if kind == 'try':
            raw.append(try_tex(name, inner))
        elif kind == 'proof':
            raw.append('\\begin{proof}[%s]\n%s\n\\end{proof}' % ('Proof' + (': ' + tex_inline(name) if name else ''), md_tex(inner, figs)))
        elif kind == 'example':
            raw.append('\\begin{examplebox}[%s]\n%s\n\\end{examplebox}' % ('Example' + (': ' + tex_inline(name) if name else ''), md_tex(inner, figs)))
        elif kind == 'check':
            raw.append('\\begin{checkbox}\n\\begin{enumerate}[leftmargin=*]\n%s\\end{enumerate}\n\\end{checkbox}' % ''.join(
                '  \\item \\askq{%s}\\par\\textit{Answer:} %s\n' % (tex_inline(q), tex_inline(a)) for q, a in parse_check(inner)))
        else:
            raw.append('\\begin{%s}\n%s\n\\end{%s}' % (box_env.get(m.group(1), 'shortbox'), md_tex(m.group(3), figs), box_env.get(m.group(1), 'shortbox')))
        return '\n\n\x03%d\x03\n\n' % (len(raw) - 1)

    src = re.sub(BOX_RE, fence, src.replace('\r', ''))
    src = re.sub(r'\$\$(!?)(.+?)\$\$', lambda m: '\n\n$$%s%s$$\n\n' % (m.group(1), m.group(2)), src, flags=re.S)
    out = []
    for block in re.split(r'\n\s*\n', src.strip()):
        lines = [l for l in block.split('\n') if l.strip()]
        if not lines:
            continue
        first = lines[0]
        tok = re.fullmatch(r'\s*\x03(\d+)\x03\s*', block)
        figm = re.fullmatch(r'\[\[fig ([\w-]+)\]\]', block.strip())
        if tok:
            out.append(raw[int(tok.group(1))])
        elif figm:
            name = figm.group(1)
            figs.append(name)
            cap = figure_caption(name)
            out.append('\\begin{figure}[ht]\n\\centering\n\\rikuywidget[width=0.92\\linewidth]{widgets/%s.html}{figures/%s.png}\n%s\\end{figure}'
                       % (name, name, ('\\caption*{\\small %s}\n' % tex_text(cap)) if cap else ''))
        elif block.strip() == '[[figure]]' or block.lstrip().startswith(('<svg', '<figure')):
            continue
        elif block.strip().startswith('$$!'):
            out.append('\\begin{equation*}\n\\color{keyblue}%s\n\\end{equation*}' % block.strip()[3:-2].strip())
        elif block.strip().startswith('$$'):
            out.append('\\[\n%s\n\\]' % block.strip()[2:-2].strip())
        elif first.startswith('#'):
            level = len(first) - len(first.lstrip('#'))
            text = first.lstrip('#').strip()
            out.append('\\%s*{%s}' % ('section' if level <= 2 else 'subsection', tex_inline(text)))
            if lines[1:]:
                out.append(md_tex('\n'.join(lines[1:]), figs))
        elif first.startswith('- '):
            out.append('\\begin{itemize}\n%s\\end{itemize}' % tex_items(lines, re.compile(r'- ')))
        elif re.match(r'\d+\. ', first):
            out.append('\\begin{enumerate}\n%s\\end{enumerate}' % tex_items(lines, re.compile(r'\d+\. ')))
        elif first.startswith('>'):
            out.append('\\begin{resultbox}\n%s\n\\end{resultbox}' % md_tex('\n'.join(re.sub(r'^>\s?', '', l) for l in lines), figs))
        elif first.startswith('|'):
            out.append(tex_table(lines))
        else:
            out.append(tex_inline(' '.join(l.strip() for l in lines)))
    return '\n\n'.join(out)


TEX_PREAMBLE = r"""\documentclass[11pt,a4paper]{article}
% Exported from @URL@ for Rikuy. Figures are live in Rikuy; any other TeX prints their pictures.
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\setlength{\emergencystretch}{2em}
\IfFileExists{carlito.sty}{\usepackage[sfdefault,lining]{carlito}}{\renewcommand{\familydefault}{\sfdefault}}
\usepackage{amsmath,amssymb,mathtools,amsthm}
\usepackage[margin=2.3cm]{geometry}
\usepackage{xcolor,graphicx,booktabs,tabularx,array,enumitem,titlesec,caption}
\usepackage[most]{tcolorbox}
\usepackage[hidelinks]{hyperref}
\usepackage{rikuy}
% Pedro's colours
\definecolor{keyred}{HTML}{C00000}
\definecolor{labelpurple}{HTML}{A02B93}
\definecolor{askgreen}{HTML}{3E8E23}
\definecolor{headgreen}{HTML}{4EA72E}
\definecolor{flagorange}{HTML}{E97132}
\definecolor{keyblue}{HTML}{0F9ED5}
\newcommand{\keyterm}[1]{\textcolor{keyred}{#1}}
\newcommand{\sublabel}[1]{\textcolor{labelpurple}{\textbf{#1}}}
\newcommand{\askq}[1]{\textcolor{askgreen}{\textbf{#1}}}
\newcommand{\kr}[1]{\textcolor{keyred}{#1}}
\newcommand{\kp}[1]{\textcolor{labelpurple}{#1}}
\newcommand{\kg}[1]{\textcolor{askgreen}{#1}}
\newcommand{\kb}[1]{\textcolor{keyblue}{#1}}
\providecommand{\R}{\mathbb{R}}
\providecommand{\N}{\mathbb{N}}
\titleformat{\section}{\color{headgreen}\Large\bfseries}{}{0pt}{}
\titleformat{\subsection}{\color{headgreen}\large\bfseries}{}{0pt}{}
\setlength{\parindent}{0pt}
\setlength{\parskip}{5pt plus 1pt}
\setlist{itemsep=2pt,topsep=3pt}
\tcbset{boxsep=0pt,left=8pt,right=8pt,top=6pt,bottom=6pt,breakable,before skip=8pt,after skip=8pt}
\newtcolorbox{shortbox}{colback=black!4,colframe=black!4,arc=2pt,title={\textbf{In short}},coltitle=black,fonttitle=\large,attach title to upper={\par}}
\newtcolorbox{intuitionbox}{enhanced,frame hidden,colback=white,borderline west={1.5pt}{0pt}{keyblue},sharp corners,title={\textbf{Intuition}},coltitle=keyblue,colbacktitle=white,attach title to upper={\par}}
\newtcolorbox{notebox}{colback=black!4,colframe=black!4,arc=2pt,title={\textbf{Note!}},coltitle=flagorange,colbacktitle=black!4,attach title to upper={\ }}
\newtcolorbox{takeawaybox}{enhanced,frame hidden,colback=white,borderline west={1.5pt}{0pt}{flagorange},sharp corners,title={\textbf{Takeaway!}},coltitle=flagorange,colbacktitle=white,attach title to upper={\ }}
\newtcolorbox{trybox}{enhanced,frame hidden,colback=white,borderline west={1.5pt}{0pt}{askgreen},sharp corners,title={\textbf{Try it} \normalfont\small (live in Rikuy and on the website)},coltitle=askgreen,colbacktitle=white,attach title to upper={\par}}
\newcommand{\trystep}[1]{\par\smallskip\textcolor{labelpurple}{\textbf{#1}}\par}
\newcommand{\nv}[2]{#2}
\newtcolorbox{examplebox}[1][Example]{enhanced,frame hidden,colback=white,borderline west={1.5pt}{0pt}{labelpurple},sharp corners,title={\textbf{#1}},coltitle=labelpurple,colbacktitle=white,attach title to upper={\par}}
\newtcolorbox{checkbox}{colback=white,colframe=askgreen,boxrule=0.5pt,arc=2pt,title={\textbf{Check yourself}},coltitle=askgreen,colbacktitle=white,attach title to upper={\par}}
\newtcolorbox{resultbox}{colback=white,colframe=black!25,arc=2pt,boxrule=0.5pt}
\title{\vspace{-1.5em}\textbf{@LABEL@: @TITLE@}}
\author{@COURSE@ \quad\textperiodcentered\quad Pedro F. Rackebrandt}
\date{}
\begin{document}
\maketitle
\vspace{-2em}
"""


def tex_document(n, body):
    head = (TEX_PREAMBLE.replace('@URL@', BASE + note_url(n)).replace('@LABEL@', tex_text(n['label']))
            .replace('@TITLE@', tex_text(n['title'])).replace('@COURSE@', tex_text(n['course'])))
    return head + body + '\n\n\\end{document}\n'


def widget_html(name):
    """A figure as a page of its own for Rikuy's sandboxed frame: the site's styles and scripts inline, light theme,
    and it posts its height to the editor."""
    src = 'assets/figs/%s.js' % name.split('-')[0] if not name.startswith('note-') else None
    css = [open(os.path.join(ROOT, 'assets', 'site.css'), encoding='utf-8').read(),
           open(os.path.join(ROOT, 'assets', 'notes.css'), encoding='utf-8').read()]
    js = [open(os.path.join(ROOT, 'assets', 'notes.js'), encoding='utf-8').read()]
    if src and os.path.exists(os.path.join(ROOT, src)):
        js.append(open(os.path.join(ROOT, src), encoding='utf-8').read())
        c = src[:-3] + '.css'
        if os.path.exists(os.path.join(ROOT, c)):
            css.append(open(os.path.join(ROOT, c), encoding='utf-8').read())
    elif not src:
        # the shared note-* figures take their lecture's colours from that lecture's css (scoped by data-nfig), so carry them all
        css += [open(os.path.join(ROOT, 'assets', 'figs', f), encoding='utf-8').read() for f in fig_files('.css')]
    css.append('html,body{margin:0;background:transparent}.rikuy-widget{padding:4px 2px 8px}')
    # the frame may load nothing from outside (Rikuy allows fonts only as data), so the site's web fonts go and the
    # system font takes over; the caption goes too, since the LaTeX caption under the figure says the same
    css = [re.sub(r'@font-face\s*\{[^}]*\}\s*', '', c) for c in css]
    fig = re.sub(r'<figcaption[^>]*>.*?</figcaption>\s*', '', figure(name), flags=re.S)
    post = ("(function(){var last=0;function send(){var h=Math.ceil(document.documentElement.scrollHeight);"
            "if(h!==last){last=h;parent.postMessage({rikuy:'height',px:h},'*');}}"
            "if(window.ResizeObserver) new ResizeObserver(send).observe(document.body); window.addEventListener('load',send); send();})();")
    return ('<!doctype html>\n<html lang="en" data-theme="light">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>%s</title>\n<style>\n%s\n</style>\n</head>\n'
            '<body>\n<div class="rikuy-widget explainer">\n%s\n</div>\n<script>\n%s\n</script>\n</body>\n</html>\n'
            % (name, '\n'.join(css), fig, '\n'.join(js + [post]).replace('</script', '<\\/script')))


SHOTS = os.path.join(ROOT, 'data', 'figshots')


def figshot(name, html):
    """The picture a TeX compile prints for a widget, cached by the widget's hash; made by tools/figshots.py."""
    digest = hashlib.sha1(html.encode('utf-8')).hexdigest()[:12]
    png = os.path.join(SHOTS, '%s-%s.png' % (name, digest))
    if not os.path.exists(png):
        os.makedirs(SHOTS, exist_ok=True)
        tmp = png + '.html'
        open(tmp, 'w', encoding='utf-8').write(html)
        run = subprocess.run(['python3', os.path.join(ROOT, 'tools', 'figshots.py'), tmp, png], capture_output=True, text=True)
        os.remove(tmp)
        if run.returncode or not os.path.exists(png):
            print('No picture for figure %s (needs Python Playwright): %s' % (name, run.stderr.strip().split('\n')[-1:]))
            return None
        for old in os.listdir(SHOTS):
            if old.startswith(name + '-') and old != os.path.basename(png):
                os.remove(os.path.join(SHOTS, old))
    return open(png, 'rb').read()


def rikuy_zip(n, src):
    import io
    import zipfile
    figs = []
    body = md_tex(src, figs)
    files = {'main.tex': tex_document(n, body).encode('utf-8'),
             'rikuy.sty': open(os.path.join(ROOT, 'assets', 'rikuy.sty'), 'rb').read(),
             'README.txt': ('%s %s: %s\n\nOpen this folder (or the zip) in Rikuy: the figures are live there.\n'
                            'Any other LaTeX (Overleaf, a desktop TeX Live) compiles main.tex with the pictures in figures/.\n'
                            % (n['course'], n['label'], n['title'])).encode('utf-8')}
    for name in dict.fromkeys(figs):
        html = widget_html(name)
        files['widgets/%s.html' % name] = html.encode('utf-8')
        png = figshot(name, html)
        if png:
            files['figures/%s.png' % name] = png
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(files):
            info = zipfile.ZipInfo(path, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, files[path])
    return buf.getvalue()


def write_rikuy_downloads():
    """Seal each note's Rikuy zip next to its page (notes/<slug>/rikuy.sealed), fetched by the page's download button."""
    import base64
    items, zips = [], {}
    for n in NOTES:
        data = rikuy_zip(n, note_source(n))
        zips[n['slug']] = data
        items.append({'id': 'rikuy/' + n['slug'], 'text': base64.b64encode(data).decode()})
    if not items:
        return
    for box in seal('seal', items):
        slug = box['id'].split('/', 1)[1]
        out = {'iv': box['iv'], 'ct': box['ct'], 'salt': LOCK['salt'], 'iter': LOCK['iter'], 'name': rikuy_name(next(n for n in NOTES if n['slug'] == slug))}
        open(os.path.join(ROOT, 'notes', slug, 'rikuy.sealed'), 'w', encoding='utf-8').write(json.dumps(out))
    return zips


def rikuy_name(n):
    return re.sub(r'[^A-Za-z0-9]+', '_', '%s %s %s' % (n['course'], n['label'], n['title'])).strip('_') + '.zip'



def build_forward(t):
    """rackebrandt.pe/<path>/ for a tool that lives elsewhere: a page that only sends the visitor on. No script
    (the policy allows none), so it is a refresh in the head and a link for a browser that ignores it."""
    url = escape(tool_url(t), quote=True)
    return '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=%s">
<link rel="canonical" href="%s">
<title>%s</title>
</head>
<body>
<p><a href="%s">Open %s</a></p>
</body>
</html>
''' % (url, url, escape(t['name']), url, escape(t['name']))


def build_llms():
    lines = ['# %s' % SITE['name'], '', '> %s' % SITE['description'], '']
    for b in SITE['bio']:
        lines += [bio_for_agents(b), '']
    lines += ['## Research', '']
    for p in sorted(PAPERS, key=lambda q: -int(q['year'])):
        who = (' With %s.' % ', '.join(c['name'] for c in p['coauthors'])) if p.get('coauthors') else ''
        extra = ''.join(' %s: %s.' % (k.upper() if k == 'pdf' else k.capitalize(), v) for k, v in p.get('links', {}).items() if v)
        lines.append('- [%s](%s%s): %s, %s. Topic: %s.%s %s%s' % (p['title'], BASE, url_of(p), p['status'], p['year'], p['topic'], who, p['summary'], extra))
    lines += ['', '## Tools', '']
    for t in SITE['tools']:
        tags = [t['status']] if t.get('status') else []
        tags = (' (%s)' % ', '.join(tags + t.get('tags', []))) if tags or t.get('tags') else ''
        name = '[%s](%s)' % (t['name'], tool_url(t)) if tool_url(t) else t['name']
        # a tool that says how agents can use it has a file of its own for that: name it here
        agents = t.get('agents', '')
        agents = (' How an agent can use it: %s' % agents) if agents.startswith('https://') else ''
        lines.append('- %s%s: %s%s' % (name, tags, plain(t['text']), agents))
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
        out += [plain(x) + '\n' for x in full_text(p, True)]
        if p.get('figure_help'):
            out += ['How to read the figure:', ''] + [plain(x) + '\n' for x in p['figure_help']]
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
    if PASSWORD:
        for p in PAPERS:
            pages[os.path.join(ROOT, 'papers', p['slug'], 'index.html')] = build_paper(p)
    else:
        print('No notes password: papers/ left as it is (paper pages are sealed with it).')
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
        write_rikuy_downloads()
    urls = [BASE + '/']
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % (
        '\n'.join('  <url><loc>%s</loc></url>' % u for u in urls))
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    for t in SITE['tools']:
        if tool_url(t) and re.fullmatch(r'[a-z0-9-]+', t.get('path', '')) and t['path'] not in RESERVED:
            os.makedirs(os.path.join(ROOT, t['path']), exist_ok=True)
            open(os.path.join(ROOT, t['path'], 'index.html'), 'w', encoding='utf-8').write(build_forward(t))
    open(os.path.join(ROOT, 'llms.txt'), 'w', encoding='utf-8').write(build_llms())
    open(os.path.join(ROOT, 'llms-full.txt'), 'w', encoding='utf-8').write(build_llms_full())
    print('built index.html, %d paper pages, %d note pages, sitemap.xml, llms.txt, llms-full.txt' % (len(PAPERS) if PASSWORD else 0, len(NOTES)))


if __name__ == '__main__':
    main()
