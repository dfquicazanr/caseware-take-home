# Decisions

These are the five calls where I think another reasonable implementation would behave differently. Each one has a short ADR in [`docs/adr/`](docs/adr) with the full reasoning. There are ten ADRs in total; the other five are smaller.

## 1. The select is an APG select-only combobox, and focus never leaves the trigger ([ADR 0001](docs/adr/0001-select-only-combobox-pattern.md), [ADR 0010](docs/adr/0010-expanded-announced-before-active-option.md))

I followed the W3C select-only combobox pattern: the trigger keeps focus the whole time, and the active option is pointed at with `aria-activedescendant`. The brief asks that focus is never lost and that dismissing returns it somewhere sensible. With this pattern I get both for free, because focus simply never moves.

**The alternative I considered** was moving real focus into the list (each option focusable). Some screen readers handle that better than `aria-activedescendant`, but then every open, close and option change needs focus handling, and each of those is a chance to drop focus on the page. If I had gone that way, my tests would check `document.activeElement` on every step instead of ARIA state.

One thing I only found with a real screen reader: when the list opened, NVDA announced the option but not "expanded", because both changed in the same update. So the list now exposes "expanded" first and the active option about 50 ms later.

## 2. Tab closes the list without choosing ([ADR 0004](docs/adr/0004-tab-closes-without-choosing.md))

The W3C example picks the highlighted option when you press Tab. I didn't do that on purpose. Here the value is who reviews an engagement. If you arrow past a name, change your mind and tab away, you shouldn't end up assigning that person without noticing. So the value only changes with Enter, Space or a click on an option. Escape, Tab and clicking outside all leave it as it was.

## 3. Unavailable options can be reached, but not chosen ([ADR 0009](docs/adr/0009-disabled-options-reachable-not-choosable.md))

My first plan was to skip unavailable options when moving with the arrows. I changed it before writing the code. With `aria-activedescendant`, a screen reader only reads the option you're on, so a skipped option is never read at all, and a blind user would never know that, say, a reviewer on leave exists. The brief asks that unavailable options are "conveyed" as unavailable, not hidden. So you can land on them and hear "unavailable", but Enter, Space and click do nothing.

## 4. Options come in as simple data, and forms go through `ControlValueAccessor` ([ADR 0002](docs/adr/0002-options-passed-as-kit-shaped-data.md), [ADR 0003](docs/adr/0003-control-value-accessor-over-signal-forms.md), [ADR 0008](docs/adr/0008-unknown-value-is-a-validation-error.md))

Teams map their data once to `{ value, label, disabled? }`. I went for the simplest shape because it's the hardest to get wrong, typeahead always has a label to work with, and a few hundred options stay cheap. Values are compared with `===`, so they should be ids; a `compareWith` can be added later without breaking anyone.

For forms I wanted to use the newer Signal Forms, so I checked the actual package. `FormValueControl` is still marked experimental in Angular 21, which is what this kit is on, and only becomes stable in 22. Moving the kit to 22 just for this would force every team using it to upgrade at the same time. I've had enough trouble with that kind of thing to prefer what is stable. `ControlValueAccessor` is stable, and Signal Forms can still talk to it, so nobody gets locked out.

If the form holds a value that isn't in the list (for example a reviewer who was removed), I don't quietly reset it, and I don't hide it either. The control becomes invalid with a `cwSelectUnknownValue` error and shows a message that screen readers also read. A component shouldn't change your form data on its own, but it also shouldn't let a bad value get submitted without anyone noticing.

## 5. Semantic tokens only, themes as an attribute, and the list as a native popover ([ADR 0007](docs/adr/0007-semantic-token-layer-and-theme-attribute.md), [ADR 0005](docs/adr/0005-native-popover-with-anchor-positioning.md))

Components only read tokens that say what something is for (`--cw-color-text-muted`, `--cw-color-status-danger-fg`…), never raw colours. A theme is just `data-cw-theme="dark"` or `"high-contrast"` on `<html>` or any element, and it only redefines those tokens. That's why each extra theme is one block of CSS and no component changes. I kept the token list to what the components actually use, because every name is something other teams will depend on. `npm run check:contrast` checks every colour pair in every theme against WCAG; it caught one of the dark theme colours I'd picked.

The list renders in the browser's top layer (`popover="manual"`) and is placed under the trigger with CSS anchor positioning. **The alternative** was plain absolute positioning, which is faster to build, but it gets cut off inside any container with `overflow: hidden`. For a component other teams drop into their own layouts, I'd rather solve that from day one than get the same bug report from every team.

## Assumptions

- The kit stays on Angular 21, like the starter, because not every team will be ready for 22.
- Supported browsers are the ones with CSS anchor positioning (Chrome and Edge 125, Safari 26, Firefox 147). Older browsers still get a working list; it just shows up centred instead of under the control.
- Announcing when a status _changes_ (say, an engagement becoming Ready) is the screen's job, not the badge's. Only the screen knows which changes matter, and you don't want 50 announcements when a list of 50 badges refreshes.
