import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Select, SelectOption } from './select';

/*
 * cw-select is tested only through its public seam: rendered in a host exactly
 * as a consumer would use it (reactive FormControl), driven by keyboard and
 * pointer events, and observed through the DOM, ARIA and the form control.
 */

const OPTIONS: SelectOption<string>[] = [
  { value: 'u1', label: 'Marta Halvorsen' },
  { value: 'u2', label: 'Aisha Bello' },
  { value: 'u3', label: 'Aidan Brennan' },
  { value: 'u4', label: 'Chen Wei', disabled: true },
  { value: 'u5', label: 'Sofia Marchetti' },
];

@Component({
  imports: [Select, ReactiveFormsModule],
  template: `
    <button type="button" id="before">before</button>
    <cw-select
      label="Reviewer"
      placeholder="Any reviewer"
      [options]="options()"
      [formControl]="control"
    />
  `,
})
class Host {
  readonly options = signal(OPTIONS);
  readonly control = new FormControl<string | null>(null);
}

async function setup(initial: string | null = null) {
  TestBed.configureTestingModule({ imports: [Host] });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.control.setValue(initial);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const combobox = () => root.querySelector<HTMLElement>('[role="combobox"]')!;
  const listbox = () => root.querySelector<HTMLElement>('[role="listbox"]')!;
  const options = () => [...root.querySelectorAll<HTMLElement>('[role="option"]')];
  const activeOption = () => {
    const id = combobox().getAttribute('aria-activedescendant');
    return id ? document.getElementById(id) : null;
  };
  const press = async (key: string) => {
    combobox().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };
  return { fixture, root, control: fixture.componentInstance.control, combobox, listbox, options, activeOption, press };
}

const nameOf = (el: HTMLElement) =>
  (el.getAttribute('aria-labelledby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent?.trim())
    .join(' ');

describe('cw-select', () => {
  beforeEach(() => TestBed.resetTestingModule());

  describe('Given no value', () => {
    it('then it is a collapsed combobox named by its label and showing the placeholder', async () => {
      const { combobox } = await setup();

      expect(nameOf(combobox())).toBe('Reviewer');
      expect(combobox().textContent?.trim()).toBe('Any reviewer');
      expect(combobox().getAttribute('aria-expanded')).toBe('false');
      expect(combobox().getAttribute('aria-haspopup')).toBe('listbox');
    });
  });
  describe('Given a collapsed combobox', () => {
    it('when ArrowDown is pressed, then the list opens with the first option active', async () => {
      const { combobox, listbox, options, activeOption, press } = await setup();

      await press('ArrowDown');

      expect(combobox().getAttribute('aria-expanded')).toBe('true');
      expect(combobox().getAttribute('aria-controls')).toBe(listbox().id);
      expect(options().map((o) => o.textContent?.trim())).toEqual(OPTIONS.map((o) => o.label));
      expect(activeOption()?.textContent?.trim()).toBe('Marta Halvorsen');
    });

    it('when it opens with a value, then the selected option is active and marked selected', async () => {
      const { options, activeOption, press } = await setup('u3');

      await press('Enter');

      expect(activeOption()?.textContent?.trim()).toBe('Aidan Brennan');
      expect(options().map((o) => o.getAttribute('aria-selected'))).toEqual([
        'false', 'false', 'true', 'false', 'false',
      ]);
    });

    it('then unavailable options are conveyed as disabled, not only styled', async () => {
      const { options, press } = await setup();

      await press(' ');

      expect(options()[3].getAttribute('aria-disabled')).toBe('true');
      expect(options()[0].hasAttribute('aria-disabled')).toBe(false);
    });

    it('then no option is active while the list is closed', async () => {
      const { combobox } = await setup('u2');

      expect(combobox().hasAttribute('aria-activedescendant')).toBe(false);
    });
  });
  describe('Given an open list', () => {
    const label = (el: HTMLElement | null) => el?.textContent?.trim();

    it('when arrowing, then the active option moves, landing on unavailable options too, and stops at the ends', async () => {
      const { activeOption, press } = await setup();
      await press('ArrowDown');

      await press('ArrowDown');
      await press('ArrowDown');
      await press('ArrowDown');
      expect(label(activeOption())).toBe('Chen Wei');

      await press('ArrowDown');
      await press('ArrowDown');
      expect(label(activeOption())).toBe('Sofia Marchetti');

      await press('ArrowUp');
      expect(label(activeOption())).toBe('Chen Wei');
    });

    it('when Home or End is pressed, then the first or last option becomes active', async () => {
      const { activeOption, press } = await setup();
      await press('ArrowDown');

      await press('End');
      expect(label(activeOption())).toBe('Sofia Marchetti');
      await press('Home');
      expect(label(activeOption())).toBe('Marta Halvorsen');
    });

    it('when Enter is pressed, then the active option is chosen, the list closes and the control is dirty', async () => {
      const { control, combobox, press } = await setup();
      await press('ArrowDown');
      await press('ArrowDown');

      await press('Enter');

      expect(control.value).toBe('u2');
      expect(control.dirty).toBe(true);
      expect(combobox().getAttribute('aria-expanded')).toBe('false');
      expect(combobox().textContent?.trim()).toBe('Aisha Bello');
    });

    it('when Space is pressed on an unavailable option, then nothing is chosen and the list stays open', async () => {
      const { control, combobox, press } = await setup();
      await press('ArrowDown');
      await press('End');
      await press('ArrowUp');

      await press(' ');

      expect(control.value).toBeNull();
      expect(control.dirty).toBe(false);
      expect(combobox().getAttribute('aria-expanded')).toBe('true');
    });

    it('when Escape is pressed, then the list closes and the value is unchanged', async () => {
      const { control, combobox, press } = await setup('u1');
      await press('ArrowDown');
      await press('ArrowDown');

      await press('Escape');

      expect(combobox().getAttribute('aria-expanded')).toBe('false');
      expect(control.value).toBe('u1');
      expect(control.dirty).toBe(false);
    });

    it('when Tab is pressed, then the list closes without choosing the active option (ADR 0004)', async () => {
      const { control, combobox, press } = await setup('u1');
      await press('ArrowDown');
      await press('ArrowDown');

      await press('Tab');

      expect(combobox().getAttribute('aria-expanded')).toBe('false');
      expect(control.value).toBe('u1');
    });
  });
  describe('Given a pointer user', () => {
    const click = async (el: Element, fixture: { whenStable(): Promise<unknown> }) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await fixture.whenStable();
    };

    it('when an option is clicked, then it is chosen, the list closes and focus is on the combobox', async () => {
      const { fixture, control, combobox, options } = await setup();
      await click(combobox(), fixture);

      await click(options()[4], fixture);

      expect(control.value).toBe('u5');
      expect(combobox().getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(combobox());
    });

    it('when an unavailable option is clicked, then nothing is chosen and the list stays open', async () => {
      const { fixture, control, combobox, options } = await setup();
      await click(combobox(), fixture);

      await click(options()[3], fixture);

      expect(control.value).toBeNull();
      expect(combobox().getAttribute('aria-expanded')).toBe('true');
    });

    it('when the combobox is clicked while open, then the list closes', async () => {
      const { fixture, combobox } = await setup();
      await click(combobox(), fixture);

      await click(combobox(), fixture);

      expect(combobox().getAttribute('aria-expanded')).toBe('false');
    });

    it('when the pointer goes down outside, then the list closes without choosing', async () => {
      const { fixture, root, control, combobox, press } = await setup('u1');
      await press('ArrowDown');

      root.querySelector('#before')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      await fixture.whenStable();

      expect(combobox().getAttribute('aria-expanded')).toBe('false');
      expect(control.value).toBe('u1');
    });
  });
});
