# Components consume only semantic tokens; themes are a data attribute that redefines them

`_semantic.scss` defines role-named custom properties (`--cw-color-text`, `--cw-color-status-success-fg`, `--cw-radius-control`…) mapped from primitives, and only the roles components actually use. There is no per-component token layer. A theme is `data-cw-theme="dark" | "high-contrast"` on `<html>` or any element, and it redefines semantic tokens only, so a theme never touches component styles and a subtree can be themed independently. The kit does not switch themes from OS preferences; the consuming app decides (the workbench seeds its toggle from `prefers-color-scheme`).

## Considered Options

- **Per-component tokens** (`--cw-select-border`…) on top of the semantic layer. More override points, but many more public names to keep stable across versions, which also increases collisions when two kit versions share a page.
- **Kit-driven `prefers-color-scheme`/`prefers-contrast` switching.** Rejected: products may deliberately keep a light screen, and the app should not have to fight the kit to do so.

## Consequences

Dark-mode status indicators need mid tones the primitive palette lacks. Primitives are added only where a measured pairing fails WCAG contrast, and each addition is noted.
