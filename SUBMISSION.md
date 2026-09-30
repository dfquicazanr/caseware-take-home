# Submission notes

## What is here

- `cw-select` ([`src/lib/select/`](src/lib/select)): a single-select combobox exported from the kit's public API, used in the workbench as the reviewer picker, the theme switcher and a 500-option list.
- Semantic token layer and two extra themes, dark and high contrast ([`src/lib/tokens/_semantic.scss`](src/lib/tokens/_semantic.scss)), switchable in the workbench header. Three mid-tone primitives were added for dark-mode indicators, each justified by a measured contrast failure.
- `cw-status-badge` reworked, with a non-breaking deprecation path.
- 36 tests (`npm test -- --watch=false`) and a contrast check across all themes (`npm run check:contrast`).
- [DECISIONS.md](DECISIONS.md), [ADOPTION.md](ADOPTION.md), and the full decision record in [`docs/adr/`](docs/adr), plus [GLOSSARY.md](GLOSSARY.md).

## What I tested and why

Tests target where a regression would reach a user, through the component's public seam (a host with a real reactive `FormControl`, keyboard and pointer events, and assertions on ARIA and form state):

- **The value must change only on purpose:** Escape, Tab and clicking outside never change it; unavailable options can never be chosen; typing never changes it.
- **What assistive technology receives:** accessible name, `aria-expanded`, `aria-activedescendant`, `aria-selected` and `aria-disabled`, and for the badge, text that is actually readable (the old badge hid its label with `aria-hidden`).
- **Forms contract:** value, disabled, touched on blur, dirty only on a user choice, and the unknown-value error when options change underneath a value.
- **The deprecation shim:** each old badge input renders exactly like its replacement.

Tests are written as Given / When / Then. Visual concerns (contrast, theming) are checked by the contrast script rather than jsdom, which cannot compute colour.

## AI usage

I used Claude (in Claude Code) throughout, working in rounds: it proposed each design decision with a recommendation, I accepted, questioned or overrode it, and only then was code written, test-first. [`docs/ai-log.md`](docs/ai-log.md) has the full log. The places I corrected or overrode it:

- **Listbox positioning:** it recommended absolute positioning for speed. I chose the native Popover API plus anchor positioning, because clipping inside `overflow: hidden` would reach every consumer team.
- **Badge tooltip:** it proposed removing it. The tooltip carries information the label does not, so I kept it and had it exposed to assistive technology.
- **Breaking-change strategy:** it proposed a clean major break. From experience of how teams upgrade (for security fixes, without reading changelogs), I chose deprecation shims and a minor release.
- **Unknown values:** it proposed leaving the value and showing the placeholder. I required the form to be told, so the component is also a validator.
- **Signal Forms:** I asked for research before accepting `ControlValueAccessor`; the decision rests on the package source (`@experimental` in 21.2.24, `@publicApi` in 22.2.1), not on memory.

**Where the AI corrected itself, or verification caught it:** it reversed its own keyboard proposal (skipping disabled options) before implementation, because skipped options are never announced. The contrast script caught one of its dark-theme colours at 4.34:1.

**How I verified:** red/green test runs for every slice; the contrast script; a scripted pass in real Chrome against the running workbench (popover anchoring, Escape, Enter on a disabled option, typeahead, theme switching, 500-option scrolling, badge accessible text and the single deprecation warning); and a manual keyboard-only and screen reader pass. **[TODO Daniel: do this pass and record what the screen reader announced.]**

## Time spent

About 1.5 hours of build time with AI assistance, plus the design discussion that preceded it. **[TODO Daniel: add manual verification time and confirm the total.]**

## What I would do next

1. **Screen reader matrix.** NVDA + Firefox/Chrome and VoiceOver + Safari, because `aria-activedescendant` support is where real behaviour differs most.
2. **Make IDs safe across federated bundles** (see ADOPTION.md): a per-bundle ID prefix.
3. **An optional option template** for rich content (for example a reviewer's role under their name). It is additive to the current `options` input.
4. **A real tooltip component** so the badge's explanation reaches keyboard and touch users.
5. **The `ng update` schematic and lint rule** for the badge migration.

## A risk I knowingly left

**Options changing while the list is open.** If the `options` input shrinks while the listbox is open (for example live data removes a reviewer), the active index is not re-clamped, so `aria-activedescendant` can briefly point at an option that no longer exists until the user presses a key. The next test I would write: *given an open list with the last option active, when the options input loses its last item, then `aria-activedescendant` references an existing option and Enter does not choose anything that is gone.*
