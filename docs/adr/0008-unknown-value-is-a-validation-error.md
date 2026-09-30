# A value that matches no option is a validation error, never silently reset

If the bound value is non-null and matches no option (for example a reviewer who has since been removed), `cw-select` leaves the value untouched and reports it: it registers as a form validator returning `{ cwSelectUnknownValue: { value } }`, sets `aria-invalid="true"`, and shows a message (`unknownValueMessage`, English default) linked to the combobox with `aria-describedby`. A kit component must not change a form's value without user action, but hiding the problem would let an invalid assignment be submitted unnoticed.

A value matching a *disabled* option is different: it is valid, shown as the current value, and simply cannot be re-chosen.

## Considered Options

- **Reset the form value to `null`.** Rejected: mutates consumer state without user action and marks the form dirty for no reason.
- **Show the placeholder and do nothing else.** Rejected (by Daniel): the form would stay valid while holding a value the user cannot see.
