/**
 * Checks WCAG contrast for every semantic foreground/background pair the kit
 * relies on, in every theme. Resolves tokens straight from the SCSS sources so
 * it can never drift from them. Exits non-zero on any failure.
 *
 *   npm run check:contrast
 */
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../src/lib/tokens/${file}`, import.meta.url), 'utf8');

/** Collects `--name: value;` declarations from every block whose selector matches. */
function declarations(source, selectorPattern) {
  const vars = {};
  for (const [, selector, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectorPattern.test(selector)) continue;
    for (const [, name, value] of body.matchAll(/(--cw-[\w-]+):\s*([^;]+);/g))
      vars[name] = value.trim();
  }
  return vars;
}

const primitives = declarations(read('_primitives.scss'), /:root/);
const semantic = read('_semantic.scss');
const base = declarations(semantic, /\[data-cw-theme='light'\]/);
const themes = {
  light: base,
  dark: { ...base, ...declarations(semantic, /\[data-cw-theme='dark'\]/) },
  'high-contrast': { ...base, ...declarations(semantic, /\[data-cw-theme='high-contrast'\]/) },
};

function resolve(name, vars) {
  let value = vars[name] ?? primitives[name];
  for (let hops = 0; value?.startsWith('var('); hops++) {
    if (hops > 10) throw new Error(`Cycle resolving ${name}`);
    const ref = value.slice(4, -1).trim();
    value = vars[ref] ?? primitives[ref];
  }
  if (!value?.startsWith('#'))
    throw new Error(`${name} does not resolve to a hex colour (got ${value})`);
  return value;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5; // WCAG 1.4.3, body text
const NON_TEXT = 3; // WCAG 1.4.11, control outlines, focus rings, indicators
const c = (name) => `--cw-color-${name}`;

/** [foreground, background, minimum ratio] */
const pairs = [
  ...['surface', 'surface-subtle', 'surface-raised'].flatMap((bg) => [
    [c('text'), c(bg), TEXT],
    [c('text-muted'), c(bg), TEXT],
  ]),
  [c('text-danger'), c('surface'), TEXT],
  [c('text-danger'), c('surface-raised'), TEXT],
  [c('highlight-text'), c('highlight-bg'), TEXT],
  [c('border-control'), c('surface'), NON_TEXT],
  [c('border-control'), c('surface-raised'), NON_TEXT],
  [c('border-danger'), c('surface-raised'), NON_TEXT],
  [c('focus-ring'), c('surface'), NON_TEXT],
  [c('focus-ring'), c('surface-raised'), NON_TEXT],
  ...['neutral', 'success', 'warning', 'danger'].flatMap((tone) => [
    [c(`status-${tone}-fg`), c(`status-${tone}-bg`), TEXT],
    [c(`status-${tone}-indicator`), c(`status-${tone}-bg`), NON_TEXT],
  ]),
];

let failures = 0;
for (const [theme, vars] of Object.entries(themes)) {
  console.log(`\n${theme}`);
  for (const [fg, bg, min] of pairs) {
    const value = ratio(resolve(fg, vars), resolve(bg, vars));
    const ok = value >= min;
    if (!ok) failures++;
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${value.toFixed(2).padStart(5)} >= ${min}  ${fg} on ${bg}`,
    );
  }
}
console.log(failures ? `\n${failures} pair(s) below the WCAG minimum.` : '\nAll pairs pass.');
process.exit(failures ? 1 : 0);
