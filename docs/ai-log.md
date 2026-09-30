# AI usage log

Running log of what the AI assistant (Claude, in Claude Code) proposed, what I changed or rejected, and how I verified it. Raw material for the submission notes.

## 2026-09-30: design decisions (round 1)

- **Pattern (ADR 0001):** AI proposed the select-only combobox. Accepted.
- **Options input (ADR 0002):** AI proposed kit-shaped data. I asked for the trade-offs spelled out before accepting.
- **Forms (ADR 0003):** AI proposed ControlValueAccessor. I pushed for something newer (Signal Forms) and asked for research. Verified in the package source: `FormValueControl` is `@experimental` in 21.2.24 and `@publicApi` in 22.2.1, and the Signal Forms `[formField]` directive bridges to an `NG_VALUE_ACCESSOR`. Decision: stay on the stable API on Angular 21 so consumer teams are not forced to upgrade.
- **Tab behaviour (ADR 0004):** AI proposed deviating from the APG example (Tab discards). Accepted; to be checked by hand during keyboard testing.
- **Positioning (ADR 0005): overrode the AI.** AI recommended absolute positioning for speed. I chose Popover API plus anchor positioning, because clipping inside `overflow: hidden` would be a bug report from every consumer team on day one. Browser support checked (anchor positioning Baseline Jan 2026). Absolute positioning stays as the fallback.
- **Tests:** AI proposed no new dependencies. I added the requirement that tests read in Given/When/Then form, and asked to revisit automated accessibility checks (axe) when we reach testing.

## 2026-09-30: design decisions (round 2: badge, tokens, themes)

- **Contrast facts computed, not guessed:** badge label `gray-400` on `gray-50` = 2.35:1 (fails 4.5:1); `green-600`/`red-600` on `gray-900` = 3.26/3.09 (fine for a dot, fails for text); `gray-500` on white = 4.38 (fails for muted text, `gray-600` = 6.41 passes).
- **Badge audit:** AI listed nine problems; I agreed to fix all nine. Live announcement of status changes deliberately left to the consuming screen.
- **Tooltip: overrode the AI.** AI proposed removing it. I pointed out it carries information the label does not (the Processing specimen's explanation), so removing it removes functionality. Kept, and exposed to assistive technology; a real tooltip is next steps.
- **Breaking change strategy: overrode the AI (ADR 0006).** AI proposed a clean major break. I chose deprecation shims, based on experience that teams upgrade for security patches without reading changelogs. Consequence: ships as a minor version.
- **Tokens, theme attribute, added primitives, light high-contrast theme, workbench on semantic tokens (ADR 0007):** accepted as proposed.

## 2026-09-30: design decisions (round 3: cw-select edge cases, test seams)

- **Unknown value: overrode the AI (ADR 0008).** AI proposed leaving the form value alone and showing the placeholder. I required that the form be told: the component now registers as a validator and shows a linked error message.
- Placeholder, no clear action, `===` comparison (compareWith documented as future work), showing an unavailable current value, build order, and test seams: accepted as proposed. Contrast will be checked by a script across all three themes.

## 2026-09-30: step 1, token layer

- AI drafted the semantic layer and three themes, and wrote `scripts/check-contrast.mjs`, which resolves every token from the SCSS sources and checks 23 foreground/background pairs per theme.
- **The script caught an AI mistake:** the AI's first dark-theme danger text (`red-400` on `gray-800`) was 4.34:1, below 4.5. Changed to `red-100` (9.12:1); `red-400` kept for the non-text danger border (3:1 rule).
- It also surfaced a failure in the supplied palette itself: the light warning dot (`amber-600` on `amber-50`) is 2.88:1, so indicators use the `-700` shades.
- Added primitives `green-400`, `amber-400`, `red-400` for dark-mode indicators, each justified by a measured pairing.

## 2026-09-30: correction before implementing (ADR 0009)

- The AI's own round-1 keyboard table said arrow keys skip disabled options, and I had accepted it. Before writing the navigation tests, the AI flagged it as wrong: with `aria-activedescendant` only the active option is announced, so skipped options would be invisible to screen reader users, which conflicts with the brief's "conveyed as unavailable". I chose reachable-but-not-choosable.
