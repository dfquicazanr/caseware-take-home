import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PendingTasks,
  afterRenderEffect,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

/** One choosable entry. Consumers map their own records into this shape (ADR 0002). */
export interface SelectOption<T> {
  value: T;
  label: string;
  /** Shown and announced as unavailable; reachable by keyboard but never chosen (ADR 0009). */
  disabled?: boolean;
}

let nextId = 0;

/** Keystrokes further apart than this start a new typeahead search. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * Gap between exposing "expanded" and the active option when the list opens.
 * NVDA drops the expanded announcement if both change in one update (ADR 0010).
 */
const ANNOUNCE_GAP_MS = 50;

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
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => Select), multi: true },
  ],
})
export class Select<T> implements ControlValueAccessor, Validator {
  /** Visible label; also the combobox's accessible name. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption<T>[]>();
  /** Shown while the value is null. */
  readonly placeholder = input('');
  /** Shown and announced when the value matches no option (ADR 0008). */
  readonly unknownValueMessage = input('The current value is not one of the available options.');

  protected readonly id = `cw-select-${nextId++}`;
  /** Unique per instance so each listbox anchors to its own trigger (ADR 0005). */
  protected readonly anchorName = `--${this.id}`;
  protected readonly value = signal<T | null>(null);
  protected readonly disabled = signal(false);
  protected readonly expanded = signal(false);
  /** Index of the option conveyed via aria-activedescendant; -1 when closed. */
  protected readonly activeIndex = signal(-1);

  protected readonly selected = computed(() => {
    const value = this.value();
    return value === null ? undefined : this.options().find((option) => option.value === value);
  });

  /** A non-null value that no option carries: kept, but reported (ADR 0008). */
  protected readonly unknownValue = computed(() => this.value() !== null && !this.selected());

  protected readonly activeId = computed(() =>
    this.expanded() && this.activeIndex() >= 0 ? this.optionId(this.activeIndex()) : null,
  );

  private typeahead = { query: '', at: 0 };

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly trigger = viewChild.required<ElementRef<HTMLElement>>('trigger');
  private readonly listbox = viewChild.required<ElementRef<HTMLElement>>('listbox');

  constructor() {
    // Options can change after the value was set; the form must re-validate.
    effect(() => {
      this.options();
      untracked(() => this.onValidatorChange());
    });

    // The listbox lives in the top layer (ADR 0005). jsdom has no Popover API,
    // hence the guards; state and ARIA never depend on it.
    afterRenderEffect(() => {
      const listbox = this.listbox().nativeElement;
      const open = this.expanded();
      if (open && !listbox.matches?.(':popover-open')) listbox.showPopover?.();
      if (!open && listbox.matches?.(':popover-open')) listbox.hidePopover?.();
    });

    // Keep the active option visible in long lists. jsdom has no scrollIntoView.
    afterRenderEffect(() => {
      const id = this.activeId();
      if (!id) return;
      this.listbox()
        .nativeElement.querySelector(`[id="${id}"]`)
        ?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  protected optionId(index: number): string {
    return `${this.id}-option-${index}`;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    if (!this.expanded()) {
      this.onKeydownWhileClosed(event);
    } else {
      this.onKeydownWhileOpen(event);
    }
  }

  /** Moves focus to the combobox, e.g. from its visible label. */
  focus(): void {
    if (this.disabled()) return;
    this.trigger().nativeElement.focus();
  }

  protected onTriggerClick(): void {
    if (this.disabled()) return;
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
    if (this.isTypeaheadKey(event)) {
      event.preventDefault();
      const match = this.findTypeaheadMatch(event.key);
      this.open(match >= 0 ? match : undefined);
      return;
    }
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
    if (this.isTypeaheadKey(event)) {
      event.preventDefault();
      const match = this.findTypeaheadMatch(event.key);
      if (match >= 0) this.activeIndex.set(match);
      return;
    }
    const last = this.options().length - 1;
    if (last < 0 && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      return;
    }
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
        // Contained: closing the list must not also close an enclosing dialog.
        event.preventDefault();
        event.stopPropagation();
        this.close();
        break;
      case 'Tab':
        // Not prevented: focus moves on as usual. Closing never chooses (ADR 0004).
        this.close();
        break;
    }
  }

  /**
   * Printable characters; Space only continues a query already in progress.
   * AltGr reports Ctrl+Alt on Windows, so it is let through, not treated as a shortcut.
   */
  private isTypeaheadKey(event: KeyboardEvent): boolean {
    if (event.key.length !== 1 || event.metaKey) return false;
    if ((event.ctrlKey || event.altKey) && !event.getModifierState('AltGraph')) return false;
    return event.key !== ' ' || this.typeaheadInProgress();
  }

  private typeaheadInProgress(): boolean {
    return this.typeahead.query !== '' && Date.now() - this.typeahead.at <= TYPEAHEAD_RESET_MS;
  }

  /**
   * Jumps, never filters (typeahead). Extends the query while keys arrive
   * quickly, searches from the active option (wrapping), and a single letter
   * repeated cycles through the options starting with it. Disabled options can
   * match (ADR 0009). Returns -1 when nothing matches.
   */
  private findTypeaheadMatch(key: string): number {
    const query =
      (this.typeaheadInProgress() ? this.typeahead.query : '') + key.toLocaleLowerCase();
    this.typeahead = { query, at: Date.now() };

    const repeated = [...query].every((char) => char === query[0]);
    const search = repeated ? query[0] : query;
    const options = this.options();
    // Closed: search from the current value, like a native select.
    const current = this.expanded()
      ? this.activeIndex()
      : options.findIndex((option) => option.value === this.value());
    // A fresh or cycling search starts after the current option; a longer query may still match it.
    const start = current < 0 ? 0 : repeated || query.length === 1 ? current + 1 : current;
    for (let offset = 0; offset < options.length; offset++) {
      const index = (start + offset) % options.length;
      if (options[index].label.toLocaleLowerCase().startsWith(search)) return index;
    }
    return -1;
  }

  private open(activeIndex?: number): void {
    const options = this.options();
    const selectedIndex = options.findIndex((option) => option.value === this.value());
    const fallback = selectedIndex >= 0 ? selectedIndex : options.length ? 0 : -1;
    const active = activeIndex ?? fallback;
    this.activeIndex.set(-1);
    this.expanded.set(true);

    // Expose "expanded" first and the active option in a later update (ADR 0010).
    // The pending task keeps the app unstable until then, so tests can await it.
    const done = this.pendingTasks.add();
    setTimeout(() => {
      if (this.expanded() && this.activeIndex() < 0) this.activeIndex.set(active);
      done();
    }, ANNOUNCE_GAP_MS);
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
  private onValidatorChange: () => void = () => {};

  writeValue(value: T | null | undefined): void {
    // Forms can hand over `undefined` (an uninitialised ngModel); it means empty, not unknown.
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    if (disabled) this.close();
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value as T | null | undefined;
    if (value == null || this.options().some((option) => option.value === value)) return null;
    return { cwSelectUnknownValue: { value } };
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}
