# AI usage log

Running log of what the AI assistant (Claude, in Claude Code) proposed, what I changed or rejected, and how I verified it. Raw material for the submission notes.

## 2026-09-30: design decisions (round 1)

- **Pattern (ADR 0001):** AI proposed the select-only combobox. Accepted.
- **Options input (ADR 0002):** AI proposed kit-shaped data. I asked for the trade-offs spelled out before accepting.
- **Forms (ADR 0003):** AI proposed ControlValueAccessor. I pushed for something newer (Signal Forms) and asked for research. Verified in the package source: `FormValueControl` is `@experimental` in 21.2.24 and `@publicApi` in 22.2.1, and the Signal Forms `[formField]` directive bridges to an `NG_VALUE_ACCESSOR`. Decision: stay on the stable API on Angular 21 so consumer teams are not forced to upgrade.
- **Tab behaviour (ADR 0004):** AI proposed deviating from the APG example (Tab discards). Accepted; to be checked by hand during keyboard testing.
- **Positioning (ADR 0005): overrode the AI.** AI recommended absolute positioning for speed. I chose Popover API plus anchor positioning, because clipping inside `overflow: hidden` would be a bug report from every consumer team on day one. Browser support checked (anchor positioning Baseline Jan 2026). Absolute positioning stays as the fallback.
- **Tests:** AI proposed no new dependencies. I added the requirement that tests read in Given/When/Then form, and asked to revisit automated accessibility checks (axe) when we reach testing.
