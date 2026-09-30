# Options are passed in as kit-shaped data

Consumers pass `options: SelectOption<T>[]`, where `SelectOption<T>` is `{ value: T; label: string; disabled?: boolean }`, and map their own records into it once (the workbench maps `ReviewerOption.unavailable` to `disabled`). The component always knows where the text and the unavailable state live, typeahead works on plain labels, and several hundred options stay a cheap `@for` over data.

## Considered Options

- **Any record shape plus accessor inputs** (`optionLabel`, `optionDisabled`). More flexible, but a larger interface where a forgotten accessor silently breaks typeahead or disabled handling.
- **Projected `<cw-option>` children.** Allows rich option content, but relies on content queries and per-child ID wiring, and is heavier at several hundred options. Rich content can be added later as an optional option template without breaking this interface.
