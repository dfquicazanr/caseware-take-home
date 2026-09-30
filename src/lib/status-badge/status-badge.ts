import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  computed,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';

export type StatusBadgeTone = 'neutral' | 'success' | 'warning' | 'danger';
export type StatusBadgeSize = 'sm' | 'md' | 'lg';

/**
 * Shows a short status label with a tone.
 *
 * The kit knows no domain statuses: consumers map their own to a tone and a
 * label (ADR 0006).
 *
 * ```html
 * <cw-status-badge tone="success" label="Ready" />
 * ```
 */
@Component({
  selector: 'cw-status-badge',
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-tone]': 'resolvedTone()',
    '[attr.data-size]': 'resolvedSize()',
    '[attr.title]': 'tooltip() || null',
  },
})
export class StatusBadge {
  readonly label = input('');
  /** Defaults to `neutral`. */
  readonly tone = input<StatusBadgeTone>();
  /** Defaults to `md`. */
  readonly size = input<StatusBadgeSize>();
  /**
   * Extra explanation. Shown on hover and read by assistive technology after
   * the label. Not reachable by keyboard or touch: keep essential information
   * in the label.
   */
  readonly tooltip = input('');

  /** @deprecated Use `tone="success"`. Removed in the next major version. */
  readonly isReady = input(false);
  /** @deprecated Use `tone="warning"`. Removed in the next major version. */
  readonly isProcessing = input(false);
  /** @deprecated Use `tone="danger"`. Removed in the next major version. */
  readonly isError = input(false);
  /** @deprecated Use `size="sm"`. Removed in the next major version. */
  readonly isSmall = input(false);
  /** @deprecated Use `size="lg"`. Removed in the next major version. */
  readonly isLarge = input(false);

  /** The new inputs win; legacy precedence matches the old stylesheet's cascade. */
  protected readonly resolvedTone = computed<StatusBadgeTone>(
    () =>
      this.tone() ??
      (this.isError()
        ? 'danger'
        : this.isProcessing()
          ? 'warning'
          : this.isReady()
            ? 'success'
            : 'neutral'),
  );
  protected readonly resolvedSize = computed<StatusBadgeSize>(
    () => this.size() ?? (this.isLarge() ? 'lg' : this.isSmall() ? 'sm' : 'md'),
  );

  constructor() {
    if (isDevMode()) {
      const warnings = inject(DeprecationWarnings);
      effect(() => {
        for (const [name, replacement] of LEGACY_INPUTS) {
          if (this[name]()) warnings.warnOnce(name, replacement);
        }
      });
    }
  }
}

const LEGACY_INPUTS = [
  ['isReady', 'tone="success"'],
  ['isProcessing', 'tone="warning"'],
  ['isError', 'tone="danger"'],
  ['isSmall', 'size="sm"'],
  ['isLarge', 'size="lg"'],
] as const;

/** One warning per deprecated input per application, however many badges use it. */
@Injectable({ providedIn: 'root' })
class DeprecationWarnings {
  private readonly warned = new Set<string>();

  warnOnce(input: string, replacement: string): void {
    if (this.warned.has(input)) return;
    this.warned.add(input);
    console.warn(
      `[cw-status-badge] "${input}" is deprecated and will be removed in the next major version. ` +
        `Use ${replacement} instead.`,
    );
  }
}
