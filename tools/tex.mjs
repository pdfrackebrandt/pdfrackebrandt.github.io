// Reads [{"tex": "...", "display": true}, ...] on stdin, writes the KaTeX HTML for each, as a JSON list, to stdout.
// Called by build.py only for math it has not rendered before (see data/math.json).
import katex from 'katex';

let input = '';
for await (const chunk of process.stdin) input += chunk;
// \kr \kp \kg \kb colour a symbol (red, purple, green, blue) to tie it to the text, as in the Word notes;
// they become classes (\htmlClass, the only trusted command) so the site's light and dark themes pick the shade.
// \nv{key}{0.52} is a live number in a Try it equation: notes.js rewrites it from the figure's state named key.
const macros = { '\\kr': '\\htmlClass{kr}{#1}', '\\kp': '\\htmlClass{kp}{#1}', '\\kg': '\\htmlClass{kg}{#1}', '\\kb': '\\htmlClass{kb}{#1}',
  '\\nv': '\\htmlClass{nv nv-#1}{#2}' };
const trust = (ctx) => ctx.command === '\\htmlClass' && /^(k[rpgb]|nv nv-[a-z][a-z0-9]*)$/.test(ctx.class);
const out = JSON.parse(input).map(({ tex, display }) =>
  katex.renderToString(tex, { displayMode: !!display, output: 'htmlAndMathml', throwOnError: true, strict: (code) => (code === 'htmlExtension' ? 'ignore' : 'error'), trust, macros: { ...macros } }));
process.stdout.write(JSON.stringify(out));
