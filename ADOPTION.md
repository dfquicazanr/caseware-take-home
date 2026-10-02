# Adoption

## Releasing the `cw-status-badge` change

My main worry here is how teams actually upgrade. In my experience most teams don't read the changelog. They bump the version because of a security fix or because something else needed it, and if that breaks their build, it stops them. So I didn't want a hard break.

The change ships as a **minor** version. The old inputs (`isReady`, `isProcessing`, `isError`, `isSmall`, `isLarge`) keep working. They're translated to the new `tone` and `size` inputs and render exactly the same (there's a test for that). They're marked `@deprecated`, so editors strike them through, and in dev mode each one logs a single warning per app telling you what to use instead. That means the accessibility and contrast fixes reach every team as soon as they upgrade, even teams that never touch their templates.

Two visible changes go at the top of the changelog. The badge no longer adds a 4px margin inside `.engagement-row` (the kit was styling the app's layout through `::ng-deep`, which it shouldn't). And the badge colours and sizes change, to pass contrast and follow the theme.

The old inputs are removed in the next **major**. What teams need to change:

| Before                                  | After                                              |
| --------------------------------------- | -------------------------------------------------- |
| `[isReady]="true"`                      | `tone="success"`                                   |
| `[isProcessing]="true"`                 | `tone="warning"`                                   |
| `[isError]="true"`                      | `tone="danger"`                                    |
| none of the above                       | `tone="neutral"` (the default)                     |
| `[isSmall]="true"` / `[isLarge]="true"` | `size="sm"` / `size="lg"`                          |
| `label="READY"` straight from the data  | map your own status to a tone and a readable label |

## Making it safe to adopt, not just possible

- **Automate the migration** with an `ng update` schematic that rewrites the old bindings. When a binding is dynamic, like `[isReady]="row.status === 'READY'"`, the schematic can't know which tone to use, so it leaves a `TODO(cw-status-badge)` comment instead of guessing.
- **Make the deprecation show up at build time**, not only in the browser console: a lint rule that warns in this minor and errors one release before the major.
- **Ship the migration table as a document an AI assistant can follow.** Most teams will do this upgrade with an agent, so give it clear instructions to apply the change the same way everywhere and report what it couldn't map.
- **Keep the equivalence test** (old input renders exactly like the new one) until the major removes the shims, and run the contrast check in CI so a token change can't quietly break a theme.

## Two versions of the kit on the same page (module federation)

I've built micro-frontends with Web Components, not with Module Federation, so this part is my analysis rather than something I've run into. Here's what I'd expect to go wrong, and how my design makes it better or worse:

- **Duplicate IDs. My design makes this worse today.** `cw-select` generates its IDs from a counter in the module (`cw-select-0`, `cw-select-1`…). Two copies of the kit both start at 0, so two selects on the same page can end up with the same ID, and `aria-labelledby`, `aria-controls` and `aria-activedescendant` would point at the wrong element. Nothing looks broken, but screen readers get the wrong information. The fix is to prefix IDs with something unique per bundle, or have the host app provide an ID service.
- **Token collisions. Mostly fine, with one weak spot.** Both copies write the same `--cw-*` variables to `:root`, and the last stylesheet loaded wins for both. Since components only read semantic tokens, this only hurts if the two versions disagree on what a token means. If a token is renamed or removed between versions, the older copy breaks silently. So token names need to follow the same versioning rules as component inputs, which is easier because I kept the list small. If versions have to live side by side for a long time, namespacing tokens per major (`--cw2-*`) is the safer option.
- **The theme attribute. My design helps here.** `data-cw-theme` is plain markup that both copies read, so switching the theme reaches both, as long as they use the same theme names.
- **Component definitions.** Angular compiles components into each bundle, so two `cw-select` definitions can live side by side without the registration clash you get with custom elements. Each copy's styles are scoped to its own instances.
- **Deprecation warnings** are de-duplicated per app, so a federated page might show one per bundle. Noisy, but harmless.
