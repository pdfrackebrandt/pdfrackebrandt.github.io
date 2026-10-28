// Reads [{"tex": "...", "display": true}, ...] on stdin, writes the KaTeX HTML for each, as a JSON list, to stdout.
// Called by build.py only for math it has not rendered before (see data/math.json).
import katex from 'katex';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const out = JSON.parse(input).map(({ tex, display }) =>
  katex.renderToString(tex, { displayMode: !!display, output: 'htmlAndMathml', throwOnError: true, strict: 'error', trust: false }));
process.stdout.write(JSON.stringify(out));
