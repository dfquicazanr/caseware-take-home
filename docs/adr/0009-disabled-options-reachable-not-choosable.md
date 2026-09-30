# Disabled options are reachable by keyboard but cannot be chosen

Arrow keys, Home/End and typeahead land on disabled options; Enter, Space and click do nothing on them, and they carry `aria-disabled="true"`. With `aria-activedescendant`, a screen reader announces only the active option, so an option that navigation skips is never announced: a screen reader user would never learn that, say, a reviewer on leave exists but is unavailable. The brief requires unavailable options to be *conveyed* as unavailable, and the APG notes that keeping disabled options focusable aids discovery.

## Considered Options

- **Skip disabled options during navigation** (originally proposed, then reversed before implementation). Fewer keystrokes to reach a choosable option, but hides unavailable options from assistive technology entirely.
