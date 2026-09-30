# cw-status-badge moves to a tone/size API, keeping the old inputs as deprecated shims

The badge's five booleans (`isReady`, `isProcessing`, `isError`, `isSmall`, `isLarge`) allowed impossible combinations and tied a kit component to the engagement domain. The new interface is `tone: 'neutral' | 'success' | 'warning' | 'danger'` and `size: 'sm' | 'md' | 'lg'`; consumers map their own statuses to a tone and a label. The old inputs keep working for one release: they are marked `@deprecated`, translated to `tone`/`size`, and log a single dev-mode warning naming the replacement. Because nothing breaks, this ships as a minor version, and the accessibility and contrast fixes reach every consumer team, including those who never migrate. Removal happens in the next major.

## Considered Options

- **Clean break in a major, with a migration table.** Less code, but teams bump versions for unrelated reasons (security patches) without reading changelogs and would get a broken build. Rejected on field experience of how consumer teams actually upgrade.
- **Domain-specific `status: 'ready' | 'processing' | 'error'`.** Simpler for the one current consumer, but puts engagement vocabulary inside the kit.

## Consequences

The `tooltip` input is kept, not removed: it carries information the visible label does not. It is now also exposed to assistive technology as a visually hidden description. It is still unreachable for keyboard and touch users, because the badge is not focusable; a real tooltip component is next-step work.
