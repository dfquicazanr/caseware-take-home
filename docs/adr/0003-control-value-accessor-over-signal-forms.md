# Forms integration uses ControlValueAccessor, not Signal Forms

`cw-select` implements `ControlValueAccessor`. In the Angular version the kit targets (21.2), Signal Forms' `FormValueControl` is marked `@experimental`. It is `@publicApi` (stable) in 22.x, but upgrading the kit to 22 would force every consuming team onto 22 at the same time, which is a compatibility cost nobody asked for. The kit stays on 21 and uses the stable API.

## Consequences

This does not lock teams out of Signal Forms: its `[formField]` directive detects an `NG_VALUE_ACCESSOR` on the host and bridges to it (verified in `@angular/forms/fesm2022/signals.mjs`, 21.2.24). When the kit moves to 22, adding `FormValueControl` is additive, not breaking.
