# Opening the list exposes "expanded" before the active option

When the listbox opens, `aria-expanded="true"` is rendered first and `aria-activedescendant` is set about 50 ms later, in a separate update. Tested with NVDA and Chrome: when both changed in the same update, NVDA announced the active option but never "expanded", so a screen reader user could not tell that a list had opened, which the brief requires. With the gap, NVDA announces "expanded" and then the option. The delay is tracked with Angular's `PendingTasks`, so `whenStable()` (and therefore the tests) waits for it; keys pressed during the gap are not overridden.

## Considered Options

- **Set both in the same update (the APG example's behaviour).** Simpler, but failed the requirement in a real screen reader.
- **Leave the active option unset on open until the first arrow key.** "Expanded" is announced, but the user no longer hears where they are in the list.
