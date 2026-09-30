# The listbox renders in the top layer via the Popover API and CSS anchor positioning

The listbox is a `popover="manual"` element positioned against the trigger with CSS anchor positioning (Baseline since Firefox 147, January 2026; Chrome and Edge 125; Safari 26). Rendering in the top layer means a consumer's `overflow: hidden` or stacking context cannot clip or hide the list. A shared kit should not ship that bug report to every team from day one. `manual` rather than `auto` keeps dismissal (Escape, Tab, outside click) under the component's own keyboard contract.

## Considered Options

- **Absolutely positioned inside the component.** About 10 minutes to build, no platform risk, but clipped inside any scrolling or `overflow: hidden` container. It is the fallback if the top-layer approach stalls.
- **`@angular/cdk` Overlay.** Solves positioning and clipping, but adds a dependency for something the platform now does natively.

## Consequences

Each instance needs a unique anchor name. jsdom has no `showPopover()`, so the component guards the call and the tests assert state and ARIA rather than top-layer rendering. Browsers older than the versions above would render the list unanchored; that is recorded as a known limitation.
