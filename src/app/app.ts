import { JsonPipe } from '@angular/common';
import { Component, DOCUMENT, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Select, SelectOption, StatusBadge } from '../lib/public-api';
import { CHANGE_GROUPS, ENGAGEMENTS, REVIEWERS } from './data/engagement-fixtures';

type Theme = 'light' | 'dark' | 'high-contrast';

/**
 * The workbench: a consumer of the kit in `src/lib`.
 *
 * It exists so components can be built, demonstrated and reviewed in a running
 * application. Change it freely — it is a consumer, not part of the kit.
 */
@Component({
  selector: 'app-root',
  imports: [JsonPipe, ReactiveFormsModule, Select, StatusBadge],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly engagements = ENGAGEMENTS;
  protected readonly reviewers = REVIEWERS;
  protected readonly changeGroups = CHANGE_GROUPS;

  /** A form control for the reviewer filter, ready for a form-integrated control. */
  protected readonly reviewerId = new FormControl<string | null>(null);

  /** The kit knows nothing about reviewers: the consumer maps them once (ADR 0002). */
  protected readonly reviewerOptions: SelectOption<string>[] = REVIEWERS.map((reviewer) => ({
    value: reviewer.id,
    label: reviewer.name,
    disabled: reviewer.unavailable,
  }));

  protected readonly themeOptions: SelectOption<Theme>[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'high-contrast', label: 'High contrast' },
  ];
  protected readonly theme = new FormControl<Theme>(initialTheme(), { nonNullable: true });

  /** Several hundred options, for checking long-list behaviour by hand. */
  protected readonly manyOptions: SelectOption<number>[] = Array.from({ length: 500 }, (_, i) => ({
    value: i + 1,
    label: `Option ${String(i + 1).padStart(3, '0')}`,
    disabled: (i + 1) % 7 === 0,
  }));
  protected readonly manyValue = new FormControl<number | null>(null);

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    const theme = toSignal(this.theme.valueChanges, { initialValue: this.theme.value });
    effect(() => root.setAttribute('data-cw-theme', theme()));
  }

  protected toggleReviewerDisabled(): void {
    if (this.reviewerId.disabled) {
      this.reviewerId.enable();
    } else {
      this.reviewerId.disable();
    }
  }
}

/** The workbench, not the kit, decides the starting theme (ADR 0007). */
function initialTheme(): Theme {
  if (typeof matchMedia !== 'function') return 'light';
  if (matchMedia('(prefers-contrast: more)').matches) return 'high-contrast';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
