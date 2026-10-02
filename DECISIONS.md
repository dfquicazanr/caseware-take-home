# Decisions

Five decisions where another reasonable implementation would behave differently. Each links to its ADR in [`docs/adr/`](docs/adr), which has the full reasoning; four more ADRs cover smaller calls.

## 1. `cw-select` is an APG select-only combobox with `aria-activedescendant` ([ADR 0001](docs/adr/0001-select-only-combobox-pattern.md))

DOM focus never leaves the trigger. The listbox's active option is conveyed with `aria-activedescendant`, so "focus is never lost to the document" and "dismissing returns focus somewhere sensible" hold by construction rather than by focus management on every open, close and option removal.

**Alternative considered:** a button that moves real focus into the listbox (roving focus). It sidesteps some screen reader and browser gaps with `aria-activedescendant`, but every transition would need explicit focus handling, and each one is a place where focus can fall to `<body>`. Had I chosen it, the tests would assert `document.activeElement` on every transition instead of ARIA state.

## 2. Tab closes the list without choosing ([ADR 0004](docs/adr/0004-tab-closes-without-choosing.md))

The APG example commits the active option on Tab. Here the value is who reviews an engagement, so arrowing past a name and tabbing away must not silently reassign it. A value changes only on Enter, Space or a click on an option; Escape, Tab and clicking outside all leave it untouched.

## 3. Disabled options are reachable but never chosen ([ADR 0009](docs/adr/0009-disabled-options-reachable-not-choosable.md))

With `aria-activedescendant`, a screen reader announces only the active option. If navigation skipped disabled options, a screen reader user would never learn that an unavailable reviewer exists. So arrows, Home/End and typeahead land on them (announced as unavailable), while Enter, Space and click do nothing. I first planned to skip them and reversed that before implementing.

## 4. Options are kit-shaped data; forms use `ControlValueAccessor` ([ADR 0002](docs/adr/0002-options-passed-as-kit-shaped-data.md), [ADR 0003](docs/adr/0003-control-value-accessor-over-signal-forms.md))

Consumers map their records once into `{ value, label, disabled? }`, which keeps the interface small, typeahead reliable and several hundred options cheap. Values compare with `===`, so they should be primitives; `compareWith` can be added later without breaking anyone.

For forms I considered Signal Forms' `FormValueControl`. It is `@experimental` in Angular 21, the version this kit targets, and stable only in 22. Moving the kit to 22 would force every consumer team to upgrade at once. `ControlValueAccessor` is stable, and Signal Forms' `[formField]` directive bridges to it, so teams already on Signal Forms are not locked out.

A value that matches no option is a validation error (`cwSelectUnknownValue`), announced with the control; the component never resets the form's value itself ([ADR 0008](docs/adr/0008-unknown-value-is-a-validation-error.md)).

## 5. Semantic tokens only; a theme is a data attribute; the listbox is a native popover ([ADR 0007](docs/adr/0007-semantic-token-layer-and-theme-attribute.md), [ADR 0005](docs/adr/0005-native-popover-with-anchor-positioning.md))

Components read role-named tokens (`--cw-color-text-muted`, `--cw-color-status-danger-fg`…) and nothing else. `data-cw-theme="dark" | "high-contrast"` on `<html>` or any subtree redefines those tokens and no component style, which is why the two extra themes cost only one block of declarations each. There is deliberately no per-component token layer: every token name is a promise to consumer teams, so the set is kept to what components use. `npm run check:contrast` resolves every token pair from the SCSS sources and checks it against WCAG in all three themes; it caught one of my own dark-theme values (4.34:1).

The listbox renders in the top layer (`popover="manual"`) and is placed with CSS anchor positioning, so a consumer's `overflow: hidden` cannot clip it. **Alternative considered:** absolute positioning inside the component, faster to build and without platform risk, but clipped inside any scrolling container, a bug every consumer team would hit.

## Assumptions

- The kit stays on Angular 21 (the starter's version); consumer teams are not all ready for 22.
- Supported browsers are those with CSS anchor positioning (Chrome/Edge 125, Safari 26, Firefox 147). Older browsers still get a working list, shown in the popover's default centred position rather than under the trigger.
- Announcing status _changes_ (for example a live region when an engagement becomes Ready) is the consuming screen's job, not the badge's: only the screen knows which changes matter, and 50 badges refreshing at once must not produce 50 announcements.
