"""Stack slash fractions in the note sources: a/b in math becomes \\frac{a}{b}, numerator over denominator.

    python3 tools/stackfrac.py content/notes/<slug>.md ...    rewrites the files, printing each formula it changes
    python3 tools/stackfrac.py --dry content/notes/<slug>.md  only prints

The operands are what a reader groups: \\partial x_k/\\partial p_\\ell, \\sigma^2/n, 1/(1-r^2) (the brackets go),
\\sum_i x_i/n (the sum stays outside), x'y/x'x, P(A)/P(B), d\\log g/d\\log L, and 1/2n as 1/(2n).
A slash stays where a stacked fraction would be cramped or wrong: in exponents and subscripts (e^{-x^2/2}),
in text (\\text{km/h}), inside a numerator or denominator (\\frac{\\partial u/\\partial x_1}{\\partial u/\\partial x_2}),
and as \\big/. Every formula the first run changed was checked by hand against its source.
"""
import re

TEXTLIKE = {'text', 'mathrm', 'operatorname', 'textbf', 'textit', 'mbox', 'textrm', 'texttt', 'label', 'nv', 'htmlClass'}
SIZES = {'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr', 'left', 'right', 'middle'}
# commands that end an operand: relations, binary operators, big operators, spacing, punctuation
STOP = {
    'sum', 'prod', 'int', 'iint', 'oint', 'lim', 'limsup', 'liminf', 'max', 'min', 'sup', 'inf', 'argmax', 'argmin',
    'cdot', 'times', 'div', 'pm', 'mp', 'circ', 'cap', 'cup', 'setminus', 'oplus', 'otimes', 'wedge', 'vee',
    'le', 'leq', 'ge', 'geq', 'ne', 'neq', 'approx', 'sim', 'simeq', 'equiv', 'propto', 'to', 'rightarrow', 'leftarrow',
    'Rightarrow', 'Leftarrow', 'iff', 'implies', 'mapsto', 'in', 'notin', 'subset', 'subseteq', 'supset', 'supseteq',
    'mid', 'perp', 'parallel', 'll', 'gg', 'prec', 'succ', 'preceq', 'succeq', 'xrightarrow', 'overset', 'underset',
    'quad', 'qquad', 'colon', 'ldots', 'cdots', 'dots', 'vdots', 'ddots', 'land', 'lor', 'lnot', 'neg', 'forall', 'exists',
    'stackrel', 'leftrightarrow', 'Leftrightarrow', 'longrightarrow', 'hookrightarrow', 'downarrow', 'uparrow',
    'sqcup', 'bigcup', 'bigcap', 'bigsqcup', 'coprod', 'begin', 'end',
}
SPACING = {',', ';', ':', '!', ' ', '>'}
ONE_ARG = {'hat', 'bar', 'tilde', 'dot', 'ddot', 'vec', 'widehat', 'widetilde', 'overline', 'underline', 'mathbb',
           'mathcal', 'boldsymbol', 'mathbf', 'bm', 'sqrt', 'check', 'breve', 'acute', 'grave', 'kr', 'kp', 'kg', 'kb',
           'operatorname', 'text', 'mathrm', 'textbf', 'textit', 'mathit', 'underbrace', 'overbrace', 'phantom',
           'textrm', 'mbox', 'mathring'}
TWO_ARG = {'frac', 'dfrac', 'tfrac', 'binom', 'nv', 'htmlClass', 'cfrac'}
OPEN = {'(': ')', '[': ']'}
DELIM_OPEN = {'lvert': 'rvert', 'lVert': 'rVert', 'langle': 'rangle', 'lfloor': 'rfloor', 'lceil': 'rceil'}
DIFFERENTIALS = {'partial', 'mathrm', 'Delta', 'delta', 'nabla'}
# names that take the next atom as their argument: \ln 0.5/\ln\alpha divides by \ln\alpha
FUNCTIONS = {'ln', 'log', 'exp', 'sin', 'cos', 'tan', 'det', 'Pr', 'lg', 'sinh', 'cosh', 'tanh', 'arcsin', 'arccos', 'arctan'}
# relations with arguments of their own
WITH_ARGS = {'xrightarrow': 1, 'xleftarrow': 1, 'overset': 2, 'underset': 2, 'stackrel': 2, 'begin': 1, 'end': 1}


def tokenize(s, i, j):
    """Tokens of s[i:j]: ('cmd', name), ('chr', c) or ('grp', children), each with its span."""
    out = []
    while i < j:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        if c == '\\':
            m = re.match(r'\\([A-Za-z]+|.)', s[i:j])
            if not m:
                out.append({'t': 'chr', 'v': c, 'a': i, 'b': i + 1})
                i += 1
                continue
            out.append({'t': 'cmd', 'v': m.group(1), 'a': i, 'b': i + len(m.group(0))})
            i += len(m.group(0))
            continue
        if c == '{':
            depth, k = 1, i + 1
            while k < j and depth:
                if s[k] == '\\':
                    k += 2
                    continue
                depth += {'{': 1, '}': -1}.get(s[k], 0)
                k += 1
            out.append({'t': 'grp', 'a': i, 'b': k, 'kids': tokenize(s, i + 1, k - 1)})
            i = k
            continue
        out.append({'t': 'chr', 'v': c, 'a': i, 'b': i + 1})
        i += 1
    return out


def atom_end(toks, k):
    """Index just after the atom that starts at toks[k], or k when toks[k] cannot start an operand."""
    n = len(toks)
    if k >= n:
        return k
    t = toks[k]
    if t['t'] == 'grp':
        k += 1
    elif t['t'] == 'chr':
        v = t['v']
        if v.isdigit() or (v == '.' and k + 1 < n and toks[k + 1]['t'] == 'chr' and toks[k + 1]['v'].isdigit()):
            while k < n and toks[k]['t'] == 'chr' and (toks[k]['v'].isdigit() or toks[k]['v'] == '.'):
                k += 1
        elif v.isalpha():
            k += 1
            if v == 'd' and k < n and toks[k]['t'] == 'cmd' and toks[k]['v'] == ',':
                k += 1
        elif v in OPEN:
            k = match_close(toks, k, v, OPEN[v])
        else:
            return k
    else:
        v = t['v']
        if v in ('big', 'Big', 'bigg', 'Bigg', 'bigl', 'Bigl', 'biggl', 'Biggl') and k + 1 < n and toks[k + 1]['t'] == 'chr' and toks[k + 1]['v'] in OPEN:
            # \big( ... \big) is one bracketed atom, like \left( ... \right)
            e = match_close(toks, k + 1, toks[k + 1]['v'], OPEN[toks[k + 1]['v']])
            if e == k + 1:
                return k
            k = e
        elif v in STOP or v in SPACING or v in SIZES and v not in ('left',):
            return k
        elif v == 'left':
            k = match_left(toks, k)
        elif v in DELIM_OPEN:
            close = DELIM_OPEN[v]
            m = k + 1
            while m < n and not (toks[m]['t'] == 'cmd' and toks[m]['v'] == close):
                m += 1
            k = min(m + 1, n)
        elif v in TWO_ARG:
            k = take_args(toks, k + 1, 2)
        elif v in ONE_ARG:
            k += 1
            if v == 'sqrt' and k < n and toks[k]['t'] == 'chr' and toks[k]['v'] == '[':
                k = match_close(toks, k, '[', ']')
            k = take_args(toks, k, 1)
        elif v.isalpha():
            k += 1
            # \partial\,\mathbb{E}(y) keeps its thin space
            if v == 'partial' and k < n and toks[k]['t'] == 'cmd' and toks[k]['v'] == ',':
                k += 1
        else:
            return k
    # scripts and primes attach to the atom
    while k < n and toks[k]['t'] == 'chr' and toks[k]['v'] in "_^'!":
        if toks[k]['v'] in "'!":
            k += 1
        else:
            k = take_args(toks, k + 1, 1)
    return k


def take_args(toks, k, count):
    for _ in range(count):
        if k < len(toks):
            if toks[k]['t'] == 'grp':
                k += 1
            elif toks[k]['t'] == 'cmd' and toks[k]['v'] in ONE_ARG | TWO_ARG:
                k = atom_end(toks, k)
            else:
                k += 1
    return k


def match_close(toks, k, o, c):
    depth, m = 0, k
    while m < len(toks):
        t = toks[m]
        if t['t'] == 'chr' and t['v'] == o:
            depth += 1
        elif t['t'] == 'chr' and t['v'] == c:
            depth -= 1
            if depth == 0:
                return m + 1
        m += 1
    return k  # unmatched: not an atom


def match_left(toks, k):
    depth, m = 0, k
    while m < len(toks):
        t = toks[m]
        if t['t'] == 'cmd' and t['v'] == 'left':
            depth += 1
        elif t['t'] == 'cmd' and t['v'] == 'right':
            depth -= 1
            if depth == 0:
                return min(m + 2, len(toks))
        m += 1
    return k


def atoms(toks):
    """Split a token list into atoms (start, end) where possible; None marks a token that is not an atom."""
    out, k = [], 0
    while k < len(toks):
        e = atom_end(toks, k)
        if e == k:
            # a big operator keeps its limits: \sum_i x_i/n stacks x_i over n, not i x_i
            e = k + 1
            if toks[k]['t'] == 'cmd' and toks[k]['v'] in WITH_ARGS:
                if e < len(toks) and toks[e]['t'] == 'chr' and toks[e]['v'] == '[':
                    e = match_close(toks, e, '[', ']')
                e = take_args(toks, e, WITH_ARGS[toks[k]['v']])
            elif toks[k]['t'] == 'cmd' and toks[k]['v'] in STOP:
                while e < len(toks) and toks[e]['t'] == 'chr' and toks[e]['v'] in "_^'":
                    e = e + 1 if toks[e]['v'] == "'" else take_args(toks, e + 1, 1)
            out.append((k, e, False))
            k = e
        else:
            out.append((k, e, True))
            k = e
    return out


def spaced_text(s, toks, atom):
    t = toks[atom[0]]
    if not (t['t'] == 'cmd' and t['v'] in TEXTLIKE and atom[1] - atom[0] >= 2 and toks[atom[0] + 1]['t'] == 'grp'):
        return False
    g = s[toks[atom[0] + 1]['a'] + 1:toks[atom[0] + 1]['b'] - 1]
    return g[:1].isspace() or g[-1:].isspace()


def head(toks, a):
    t = toks[a]
    return t['v'] if t['t'] in ('cmd', 'chr') else None


def stack(s):
    """The formula s with its top level slash fractions stacked (recursing into plain groups)."""
    return render(s, tokenize(s, 0, len(s)), 0, len(s))


def render_tok(s, toks, k, prev, deep=True):
    t = toks[k]
    if t['t'] != 'grp' or not deep:
        return s[t['a']:t['b']]
    script = prev is not None and prev['t'] == 'chr' and prev['v'] in '^_'
    textual = prev is not None and prev['t'] == 'cmd' and prev['v'] in TEXTLIKE
    # inside a fraction a slash stays: \frac{\partial u/\partial x_1}{\partial u/\partial x_2} reads better than a fraction of fractions
    fraction = any(toks[m]['t'] == 'cmd' and toks[m]['v'] in TWO_ARG and all(toks[q]['t'] == 'grp' for q in range(m + 1, k))
                   for m in (k - 1, k - 2) if m >= 0)
    if script or textual or fraction:
        return s[t['a']:t['b']]
    return '{' + render(s, t['kids'], t['a'] + 1, t['b'] - 1) + '}'


def join(s, toks, lo, hi, parens=True):
    """Render toks[lo:hi], keeping the original spacing between tokens. With parens, slashes inside (...) and [...]
    stack too, and brackets around a new fraction grow to fit it."""
    out, last, k = [], None, lo
    while k < hi:
        if last is not None:
            out.append(s[toks[last]['b']:toks[k]['a']])
        t = toks[k]
        # \big( ... \big) counts as one bracket pair
        sized = t['t'] == 'cmd' and t['v'] in ('big', 'Big', 'bigl', 'Bigl') and k + 1 < hi and toks[k + 1]['t'] == 'chr' and toks[k + 1]['v'] in OPEN
        o_at = k + 1 if sized else k
        ot = toks[o_at]
        c = match_close(toks, o_at, ot['v'], OPEN[ot['v']]) if parens and ot['t'] == 'chr' and ot['v'] in OPEN else o_at
        if sized and not (c > o_at and toks[c - 2]['t'] == 'cmd' and toks[c - 2]['v'] in SIZES):
            c = o_at
        inner_hi = c - 2 if sized else c - 1
        if lo < c <= hi and inner_hi - o_at > 1:
            inner_toks = toks[o_at + 1:inner_hi]
            inner = render(s, inner_toks, inner_toks[0]['a'], inner_toks[-1]['b'])
            flat = s[inner_toks[0]['a']:inner_toks[-1]['b']]
            grow = '\\frac' in inner and '\\frac' not in flat and '&' not in inner and '\\\\' not in inner
            grow = grow and not (k > 0 and toks[k - 1]['t'] == 'cmd' and toks[k - 1]['v'] in SIZES)
            o, cl = ot['v'], OPEN[ot['v']]
            if grow:
                out.append('\\left%s%s\\right%s' % (o, inner, cl))
            elif sized:
                out.append('%s%s%s%s%s' % (s[t['a']:t['b']], o, inner, s[toks[c - 2]['a']:toks[c - 2]['b']], cl))
            else:
                out.append('%s%s%s' % (o, inner, cl))
            last, k = c - 1, c
            continue
        out.append(render_tok(s, toks, k, toks[k - 1] if k > 0 else None, parens))
        last, k = k, k + 1
    return ''.join(out)


def unwrap(s, toks, lo, hi):
    """An operand that is one parenthesised group loses its parentheses inside \\frac."""
    if hi - lo >= 2 and toks[lo]['t'] == 'chr' and toks[lo]['v'] == '(' and atom_end(toks, lo) == hi:
        last = toks[hi - 1]
        if last['t'] == 'chr' and last['v'] == ')':
            return join(s, toks, lo + 1, hi - 1, False)
    if (hi - lo >= 4 and toks[lo]['t'] == 'cmd' and toks[lo]['v'] in ('big', 'Big', 'bigl', 'Bigl') and toks[lo + 1]['t'] == 'chr'
            and toks[lo + 1]['v'] == '(' and atom_end(toks, lo) == hi and toks[hi - 1]['v'] == ')' and toks[hi - 2]['t'] == 'cmd'):
        return join(s, toks, lo + 2, hi - 2, False)
    if hi - lo >= 2 and toks[lo]['t'] == 'cmd' and toks[lo]['v'] == 'left' and match_left(toks, lo) == hi:
        if toks[lo + 1]['t'] == 'chr' and toks[lo + 1]['v'] == '(':
            return join(s, toks, lo + 2, hi - 2, False)
    return join(s, toks, lo, hi, False)


def render(s, toks, i0, i1):
    if not any(t['t'] == 'chr' and t['v'] == '/' for t in toks):
        return join(s, toks, 0, len(toks)) if toks else s[i0:i1]
    at = atoms(toks)
    # where each slash's operands start and end, in token indices
    fracs, used = [], -1
    for idx, (a, b, ok) in enumerate(at):
        t = toks[a]
        if ok or t['t'] != 'chr' or t['v'] != '/':
            continue
        if a > 0 and toks[a - 1]['t'] == 'cmd' and toks[a - 1]['v'] in SIZES:
            continue
        # left operand: atoms back from the slash while they keep the product going
        li = idx - 1
        if li < 0 or not at[li][2] or at[li][0] < used:
            continue
        start = li
        # a slash with spaces round it (f'(u)\,u_1 / f'(u)\,u_2) divides whole products, thin spaces included
        spaced = a + 1 < len(toks) and s[toks[a - 1]['b']:t['a']] != '' and s[t['b']:toks[a + 1]['a']] != ''
        thin = lambda m: 0 <= m < len(at) and not at[m][2] and toks[at[m][0]]['t'] == 'cmd' and toks[at[m][0]]['v'] == ','
        while True:
            step = 2 if spaced and thin(start - 1) and start - 2 >= 0 and at[start - 2][2] else 1
            m = start - step
            if m < 0 or not at[m][2] or at[m][0] < used:
                break
            h = head(toks, at[m][0])
            if h in STOP or spaced_text(s, toks, at[m]):
                break
            start = m
        # right operand: one atom, more while they are plain letters or a differential begins it
        ri = idx + 1
        if ri >= len(at) or not at[ri][2]:
            continue
        # right operand: one atom, then more while they are plain letters (1/2n), a function's argument (P(A)/P(B))
        # or part of a differential (\partial^2 f/\partial x\partial y)
        end = ri
        first = head(toks, at[ri][0])
        # Leibniz notation: d\log g/d\log L and d\theta q/d\theta divide by the whole differential
        lt = toks[at[start][0]]
        leibniz = first == 'd' and at[ri][1] - at[ri][0] == 1 and lt['t'] == 'chr' and lt['v'] == 'd'
        while True:
            if spaced and thin(end + 1) and end + 2 < len(at) and at[end + 2][2]:
                end += 2
                continue
            if not (end + 1 < len(at) and at[end + 1][2]):
                break
            nt = toks[at[end + 1][0]]
            plain_letter = nt['t'] == 'chr' and nt['v'].isalpha()
            prev = toks[at[end][0]]
            # \partial e/\partial p(p^0) is evaluated at p^0, so a differential takes no argument
            argument = nt['t'] == 'chr' and nt['v'] == '(' and (prev['t'] == 'cmd' or prev['t'] == 'chr' and prev['v'].isalpha()) and first not in DIFFERENTIALS
            if leibniz and end == ri:
                end += 1
                if head(toks, at[end][0]) in FUNCTIONS and end + 1 < len(at) and at[end + 1][2]:
                    end += 1
                continue
            differential = first in DIFFERENTIALS and ((nt['t'] == 'cmd' and nt['v'] in DIFFERENTIALS) or head(toks, at[end][0]) in DIFFERENTIALS)
            # a function's argument (\ln\alpha) and a product after a transpose (\iota'\iota, x'x)
            applied = prev['t'] == 'cmd' and prev['v'] in FUNCTIONS and at[end][1] - at[end][0] == 1
            transposed = toks[at[end][1] - 1]['t'] == 'chr' and toks[at[end][1] - 1]['v'] == "'"
            if plain_letter or argument or differential or applied or transposed:
                end += 1
            else:
                break
        fracs.append((at[start][0], a, at[ri][0], at[end][1]))
        used = at[end][1]
    if not fracs:
        return join(s, toks, 0, len(toks))
    out, pos = [], 0
    for (l0, sl, r0, r1) in fracs:
        if pos < l0:
            out.append(join(s, toks, pos, l0))
            out.append(s[toks[l0 - 1]['b']:toks[l0]['a']])
        out.append('\\frac{%s}{%s}' % (unwrap(s, toks, l0, sl), unwrap(s, toks, r0, r1)))
        pos = r1
        if pos < len(toks):
            out.append(s[toks[pos - 1]['b']:toks[pos]['a']])
    if pos < len(toks):
        out.append(join(s, toks, pos, len(toks)))
    return ''.join(out)


MATH = re.compile(r'(\$\$!?)((?s:.+?))\$\$|(?<!\\)\$([^$\n]+?)\$|^([ \t]*eq:[ \t]*)([^\n]+)$', re.M)


def stack_md(text, log=None):
    """Every formula of a note: $...$, $$...$$, $$!...$$ and the eq: lines of ::: try boxes. Code spans are left alone."""
    def rep(m):
        pre, src, post = ((m.group(1), m.group(2), '$$') if m.group(1) else
                          ('$', m.group(3), '$') if m.group(3) is not None else (m.group(4), m.group(5), ''))
        new = stack(src)
        if new != src and log is not None:
            log.append((src.strip(), new.strip()))
        return pre + new + post
    return ''.join(p if p.startswith('`') else MATH.sub(rep, p) for p in re.split(r'(`[^`\n]+`)', text))


if __name__ == '__main__':
    import sys
    dry = '--dry' in sys.argv
    for f in [a for a in sys.argv[1:] if a != '--dry']:
        text, log = open(f, encoding='utf-8').read(), []
        new = stack_md(text, log)
        for old, out in log:
            print('%s\n  - %s\n  + %s' % (f, old, out))
        if not dry and new != text:
            open(f, 'w', encoding='utf-8').write(new)
