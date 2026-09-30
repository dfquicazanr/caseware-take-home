# Tab closes the list without choosing

When the listbox is open, Tab closes it, leaves the value unchanged, and lets focus move on. This deliberately departs from the APG select-only combobox example, where Tab commits the active option. In this product, the value is who reviews an engagement: arrowing past a name and tabbing away must not reassign the engagement. A value changes only on Enter, Space, or a pointer click on an option.

## Considered Options

- **Commit on Tab (APG example behaviour).** Matches the reference pattern and some native `<select>` implementations. Rejected because an accidental reassignment is silent and easy to miss.
