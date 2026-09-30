import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** One choosable entry. Consumers map their own records into this shape (ADR 0002). */
export interface SelectOption<T> {
  value: T;
  label: string;
  /** Shown and announced as unavailable; reachable by keyboard but never chosen (ADR 0009). */
  disabled?: boolean;
}

let nextId = 0;

/**
 * Single-select combobox for the kit (APG select-only combobox, ADR 0001).
 *
 * ```html
 * <cw-select label="Reviewer" [options]="reviewerOptions" [formControl]="reviewerId" />
 * ```
 *
 * Values are compared with `===`, so use primitives such as ids.
 */
@Component({
  selector: 'cw-select',
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'onDocumentPointerdown($event)',
  },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true }],
})
export class Select<T> implements ControlValueAccessor {
  /** Visible label; also the combobox's accessible name. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption<T>[]>();
  /** Shown while the value is null. */
  readonly placeholder = input('');

  protected readonly id = `cw-select-${nextId++}`;
  protected readonly value = signal<T | null>(null);
  protected readonly expanded = signal(false);
  /** Index of the option conveyed via aria-activedescendant; -1 when closed. */
  protected readonly activeIndex = signal(-1);

  protected readonly selected = computed(() => {
    const value = this.value();
    return value === null ? undefined : this.options().find((option) => option.value === value);
  });

  protected readonly activeId = computed(() =>
    this.expanded() && this.activeIndex() >= 0 ? this.optionId(this.activeIndex()) : null,
  );

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLElement>>('trigger');
  private readonly listbox = viewChild.required<ElementRef<HTMLElement>>('listbox');

  constructor() {
    // The listbox lives in the top layer (ADR 0005). jsdom has no Popover API,
    // hence the guards; state and ARIA never depend on it.
    afterRenderEffect(() => {
      const listbox = this.listbox().nativeElement;
      const open = this.expanded();
      if (open && !listbox.matches?.(':popover-open')) listbox.showPopover?.();
      if (!open && listbox.matches?.(':popover-open')) listbox.hidePopover?.();
    });
  }

  protected optionId(index: number): string {
    return `${this.id}-option-${index}`;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.expanded()) {
      this.onKeydownWhileClosed(event);
    } else {
      this.onKeydownWhileOpen(event);
    }
  }

  protected onTriggerClick(): void {
    this.trigger().nativeElement.focus();
    if (this.expanded()) {
      this.close();
    } else {
      this.open();
    }
  }

  protected onOptionClick(index: number): void {
    this.choose(index);
    this.trigger().nativeElement.focus();
  }

  protected onBlur(): void {
    this.close();
    this.onTouched();
  }

  protected onDocumentPointerdown(event: PointerEvent): void {
    if (this.expanded() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private onKeydownWhileClosed(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.open();
        break;
      case 'Home':
        event.preventDefault();
        this.open(0);
        break;
      case 'End':
        event.preventDefault();
        this.open(this.options().length - 1);
        break;
    }
  }

  private onKeydownWhileOpen(event: KeyboardEvent): void {
    const last = this.options().length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.update((index) => Math.min(index + 1, last));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update((index) => Math.max(index - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(last);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.choose(this.activeIndex());
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'Tab':
        // Not prevented: focus moves on as usual. Closing never chooses (ADR 0004).
        this.close();
        break;
    }
  }

  private open(activeIndex?: number): void {
    const options = this.options();
    const selectedIndex = options.findIndex((option) => option.value === this.value());
    const fallback = selectedIndex >= 0 ? selectedIndex : options.length ? 0 : -1;
    this.activeIndex.set(activeIndex ?? fallback);
    this.expanded.set(true);
  }

  private close(): void {
    this.expanded.set(false);
    this.activeIndex.set(-1);
  }

  /** Commits the option at `index` unless it is disabled; only user actions call this. */
  private choose(index: number): void {
    const option = this.options()[index];
    if (!option || option.disabled) return;
    this.close();
    if (option.value !== this.value()) {
      this.value.set(option.value);
      this.onChange(option.value);
    }
  }

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
