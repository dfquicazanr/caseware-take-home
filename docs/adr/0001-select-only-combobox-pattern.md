# cw-select uses the select-only combobox pattern

`cw-select` follows the WAI-ARIA APG select-only combobox: the trigger keeps DOM focus (`role="combobox"`), the popup is a `role="listbox"`, and the active option is conveyed with `aria-activedescendant`. Because focus never leaves the trigger, "focus is never lost" and "dismissing returns focus somewhere sensible" hold by construction instead of being managed on every open and close.

## Considered Options

- **Button plus listbox with roving DOM focus.** Avoids known `aria-activedescendant` gaps in some screen reader and browser pairings, but every open, close, and option removal needs explicit focus management, which is where focus gets lost to `<body>`.
- **Styled wrapper around a native `<select>`.** Free accessibility, but the popup cannot be themed, so it cannot honour the token layer.
