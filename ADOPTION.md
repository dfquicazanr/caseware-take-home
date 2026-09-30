# Adoption

## Releasing the `cw-status-badge` change

Nothing breaks, so it ships as a **minor** version. The old boolean inputs (`isReady`, `isProcessing`, `isError`, `isSmall`, `isLarge`) still work: they are translated to the new `tone` and `size` inputs, render identically (a test asserts this), carry `@deprecated` JSDoc so editors strike them through, and log one console warning per input per application in dev mode, naming the replacement. The accessibility and contrast fixes therefore reach every team on upgrade, including teams that never touch their templates. This matters because teams often bump a kit version for an unrelated reason, such as a security fix, without reading the changelog. A hard break would stop their build.

Two visible changes ship in that minor and go at the top of the changelog. First, the badge no longer adds a 4px left margin inside `.engagement-row`: the kit was styling a consumer's layout through `::ng-deep`. Second, the badge's colours and sizes change to meet contrast and follow the theme.

The deprecated inputs are removed in the next **major**. What consuming teams do:

| Before | After |
| --- | --- |
| `[isReady]="true"` | `tone="success"` |
| `[isProcessing]="true"` | `tone="warning"` |
| `[isError]="true"` | `tone="danger"` |
| none of the above | `tone="neutral"` (the default) |
| `[isSmall]="true"` / `[isLarge]="true"` | `size="sm"` / `size="lg"` |
| `label="READY"` passed straight from data | map your own status to a tone and a human label |

## Making adoption safe, not merely possible

- **Automate the migration:** an `ng update` schematic that rewrites the boolean bindings. Where a binding is dynamic (`[isReady]="row.status === 'READY'"`), the schematic cannot infer a tone mapping, so it leaves a `TODO(cw-status-badge)` comment rather than guessing.
- **Make the deprecation visible at build time**, not only in the browser console: a lint rule that flags the deprecated inputs, enabled as a warning in the minor and as an error one release before the major.
- **Publish the migration table as an agent-readable document** in the package, so a team's coding assistant can apply the change consistently and report what it could not map.
- **Keep the equivalence test** (legacy input renders exactly like its replacement) until the major removes the shims, and run the contrast check in CI so a token change cannot silently regress a theme.

## Two kit versions on one page (module federation)

What I would expect to go wrong, and how this design affects it:

- **Duplicate element IDs. This design makes it worse today.** `cw-select` builds its IDs from a module-level counter (`cw-select-0`, `cw-select-1`…). Two copies of the kit each start at 0, so two selects on the same page can share an ID, and `aria-labelledby`, `aria-controls` and `aria-activedescendant` would point at the wrong element. That is an accessibility failure with no visual symptom. Fix: prefix IDs with a per-bundle random or version-derived token, or use a shared ID service provided by the host.
- **Token collisions. Mostly contained, with one weakness.** Both versions write the same `--cw-*` custom properties to `:root`, and the last stylesheet loaded wins for both. Because components consume only semantic tokens, a collision only matters where the two versions disagree on a token's *meaning*. A token renamed or removed between versions would break the older copy silently. The mitigation is to treat semantic token names as public API under the same semver rules as inputs, which the small token set makes practical. Namespacing tokens per major (`--cw2-*`) is the stronger option if versions must coexist for long.
- **Theme attribute. This design helps.** `data-cw-theme` is plain markup that both versions read, so a theme switch reaches both copies, as long as both define the same theme names.
- **Component selectors.** Angular components are compiled into each remote, so two `cw-select` definitions coexist without the registration clash custom elements would have. Each copy styles only its own instances, because styles are emulated-encapsulated per build.
- **Deprecation warnings** are de-duplicated per application injector, so a federated page may show one warning per remote. That is noisy but harmless.
