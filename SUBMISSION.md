# Submission notes

## What's here

- **`cw-select`** ([`src/lib/select/`](src/lib/select)): a single-select combobox, exported from the kit's public API. The workbench uses it in three places: the reviewer picker, the theme switcher in the header (to show it works for things that aren't reviewers), and a 500-option list.
- **A semantic token layer and two extra themes**, dark and high contrast ([`src/lib/tokens/_semantic.scss`](src/lib/tokens/_semantic.scss)), switchable from the workbench header. I added three mid-tone primitives for dark mode, each one because a measured colour pair failed contrast without it.
- **`cw-status-badge` reworked**, with an upgrade path that doesn't break anyone.
- **44 tests** (`npm test -- --watch=false`) and a contrast check across all themes (`npm run check:contrast`).
- [DECISIONS.md](DECISIONS.md), [ADOPTION.md](ADOPTION.md), the decision records in [`docs/adr/`](docs/adr), a [GLOSSARY.md](GLOSSARY.md), and the AI log in [`docs/ai-log.md`](docs/ai-log.md).

## What I tested, and why

I focused the tests on the places where a bug would actually reach a user. They render the component the way another team would use it (with a real reactive `FormControl`), drive it with keyboard and mouse events, and only check what's visible from outside: the DOM, the ARIA attributes and the form state.

- **The value only changes when the user means it to.** Escape, Tab and clicking outside never change it, unavailable options can't be chosen, and typing never changes it.
- **What screen readers get:** the name, `aria-expanded`, `aria-activedescendant`, `aria-selected` and `aria-disabled`. For the badge, that the text is actually readable (the old badge hid its label with `aria-hidden`).
- **The forms contract:** value, disabled, touched on blur, dirty only when the user picks something, and the unknown-value error, including when the options change after the value was set.
- **The badge upgrade path:** each old input renders exactly like its replacement.

The tests are written as Given / When / Then. Colour and theming are checked by the contrast script instead, because the test DOM (jsdom) doesn't compute colours.

## How I used AI

I used Claude, in Claude Code, for the whole exercise. I worked in rounds: for each design question it proposed an option with a recommendation, and I accepted it, asked for more context, or went a different way. Only then was the code written, test-first. [`docs/ai-log.md`](docs/ai-log.md) has the full log.

**Where I went a different way from what the AI suggested:**

- **List positioning.** It suggested absolute positioning because it's faster. I went with the native popover and anchor positioning, because getting clipped inside `overflow: hidden` is a bug every team using the kit would hit.
- **The badge tooltip.** It suggested removing it. The tooltip says something the label doesn't, so removing it removes functionality. I kept it and made it readable by screen readers too.
- **Releasing the badge change.** It suggested a clean major version break. From what I've seen, teams upgrade for security fixes without reading changelogs, so I asked for deprecated inputs that keep working and a minor release.
- **Values that aren't in the list.** It suggested leaving the value and just showing the placeholder. I wanted the form to know, so the component is also a validator.
- **Signal Forms.** I wanted to use the newer API, so I asked it to check the actual package before deciding. It's still experimental in Angular 21, so I stayed with the stable one.

**Where checks caught problems in what the AI wrote:**

- It changed its own keyboard plan before coding: skipping unavailable options would hide them from screen reader users.
- The contrast script caught one of its dark theme colours (4.34:1).
- Measuring the real page in each theme caught a highlighted unavailable option at 2.6:1 in high contrast. The unit tests and the token check couldn't see that.
- Reviewing the code caught a fix that had removed the wrong CSS block.
- A separate AI review agent found seven smaller issues, which I fixed with tests. One of them was a test that couldn't fail.

**How I verified:** tests run red before green for every piece; the contrast script; scripted checks in real Chrome against the running workbench; my own keyboard testing; and a screen reader pass with NVDA and Chrome on Windows.

**What my screen reader pass found.** Two required behaviours that every automated check had passed:

- **Opening the list didn't announce "expanded"**, only the option. Both changed in the same update, so NVDA skipped the state change. The list now exposes "expanded" first and the option about 50 ms later ([ADR 0010](docs/adr/0010-expanded-announced-before-active-option.md)). NVDA now announces both.
- **The badge tooltip wasn't read at all**, even though Chrome had it in the accessibility tree. I narrowed it down with three temporary variants on the live page: the hidden text was absolutely positioned inside an element that also had a `title`. It's now positioned normally (the badge width doesn't change) and is read once.

Everything else was announced the way I expected: the label and role, unavailable options as unavailable, typeahead, the chosen value, and the removed reviewer as "invalid entry" with its message. I haven't tested VoiceOver with Safari.

## Time spent

[TIME]

## What I'd do next

1. **Test VoiceOver with Safari**, and NVDA with Firefox. `aria-activedescendant` is where screen readers differ the most, as the "expanded" issue showed.
2. **Reflect every validator in `aria-invalid`.** Right now it only reflects the select's own unknown-value check. If a team adds `Validators.required`, the field becomes invalid but screen readers aren't told. The fix is to read the bound form control's status, and let teams pass their own hint or error id for `aria-describedby`.
3. **Make IDs unique across federated bundles** (see ADOPTION.md).
4. **An optional option template** for richer content, like a reviewer's role under their name. It can be added without breaking the current `options` input.
5. **A real tooltip component**, so the badge's explanation also reaches keyboard and touch users.
6. **The `ng update` schematic and lint rule** for the badge migration.

## A risk I knowingly left in

**Options changing while the list is open.** If the `options` list gets shorter while it's open (say live data removes a reviewer), the active option isn't moved back into range, so `aria-activedescendant` can briefly point at an option that no longer exists, until the user presses a key. The next test I'd write: _given an open list with the last option active, when the options lose their last item, then `aria-activedescendant` points at an option that exists and Enter doesn't choose anything that's gone._
