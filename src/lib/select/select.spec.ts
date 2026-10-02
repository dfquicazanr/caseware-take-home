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
  const press = async (key: string, init: KeyboardEventInit = {}) => {
    combobox().dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    );
    await fixture.whenStable();
  };
  return {
    fixture,
    root,
    control: fixture.componentInstance.control,
    combobox,
    listbox,
    options,
    activeOption,
    press,
  };
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
        'false',
        'false',
        'true',
        'false',
        'false',
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

    it('when the pointer goes down on an option, then focus is not taken from the combobox', async () => {
      const { fixture, combobox, options } = await setup();
      await click(combobox(), fixture);

      const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      options()[1].dispatchEvent(mousedown);

      // Browsers move focus on mousedown; preventing it keeps focus on the combobox.
      expect(mousedown.defaultPrevented).toBe(true);
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

      root
        .querySelector('#before')!
        .dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      await fixture.whenStable();

      expect(combobox().getAttribute('aria-expanded')).toBe('false');
      expect(control.value).toBe('u1');
    });
  });
  describe('Given a keyboard user typing letters', () => {
    const label = (el: HTMLElement | null) => el?.textContent?.trim();

    it('when typing while closed, then the list opens on the first match without changing the value', async () => {
      const { control, combobox, activeOption, press } = await setup('u1');

      await press('s');

      expect(combobox().getAttribute('aria-expanded')).toBe('true');
      expect(label(activeOption())).toBe('Sofia Marchetti');
      expect(control.value).toBe('u1');
    });

    it('when typing a shared prefix, then each further letter narrows the match', async () => {
      const { activeOption, press } = await setup();

      await press('a');
      await press('i');
      expect(label(activeOption())).toBe('Aisha Bello');

      await press('d');
      expect(label(activeOption())).toBe('Aidan Brennan');
    });

    it('when typing after a pause, then matching starts again from the new letter', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        const { activeOption, press } = await setup();
        await press('a');
        await press('i');

        vi.setSystemTime(Date.now() + 1000);
        await press('c');

        expect(label(activeOption())).toBe('Chen Wei');
      } finally {
        vi.useRealTimers();
      }
    });

    it('when typing letters that match nothing, then the active option stays put', async () => {
      const { activeOption, press } = await setup();
      await press('ArrowDown');

      await press('z');

      expect(label(activeOption())).toBe('Marta Halvorsen');
    });
  });
  describe('Given a form control', () => {
    it('when the control is disabled, then the combobox is disabled, unfocusable and will not open', async () => {
      const { fixture, control, combobox, press } = await setup();

      control.disable();
      await fixture.whenStable();
      await press('ArrowDown');
      combobox().click();
      await fixture.whenStable();

      expect(combobox().getAttribute('aria-disabled')).toBe('true');
      expect(combobox().getAttribute('tabindex')).toBe('-1');
      expect(combobox().getAttribute('aria-expanded')).toBe('false');
    });

    it('when the visible label is clicked, then the combobox takes focus', async () => {
      const { root, combobox } = await setup();

      root.querySelector<HTMLElement>(`#${combobox().getAttribute('aria-labelledby')}`)!.click();

      expect(document.activeElement).toBe(combobox());
    });

    it('when focus leaves the combobox, then the control is touched but not dirty', async () => {
      const { fixture, control, combobox } = await setup();

      combobox().focus();
      combobox().blur();
      await fixture.whenStable();

      expect(control.touched).toBe(true);
      expect(control.dirty).toBe(false);
    });

    it('when the value is set programmatically, then it is shown and the control stays pristine', async () => {
      const { fixture, control, combobox } = await setup();

      control.setValue('u2');
      await fixture.whenStable();

      expect(combobox().textContent?.trim()).toBe('Aisha Bello');
      expect(control.dirty).toBe(false);
    });

    it('when the value is an unavailable option, then it is shown and the control is valid', async () => {
      const { control, combobox } = await setup('u4');

      expect(combobox().textContent?.trim()).toBe('Chen Wei');
      expect(control.valid).toBe(true);
    });
  });

  describe('Given a value that matches no option (ADR 0008)', () => {
    it('then the control is invalid, the value is kept and the error is announced with the combobox', async () => {
      const { control, combobox } = await setup('u99');

      expect(control.value).toBe('u99');
      expect(control.errors).toEqual({ cwSelectUnknownValue: { value: 'u99' } });
      expect(combobox().getAttribute('aria-invalid')).toBe('true');
      expect(combobox().textContent?.trim()).toBe('Any reviewer');
      const describedBy = combobox().getAttribute('aria-describedby')!;
      expect(document.getElementById(describedBy)?.textContent?.trim()).toBe(
        'The current value is not one of the available options.',
      );
    });

    it('when the options change so the value disappears, then the control becomes invalid', async () => {
      const { fixture, control } = await setup('u5');
      expect(control.valid).toBe(true);

      fixture.componentInstance.options.set(OPTIONS.slice(0, 4));
      await fixture.whenStable();

      expect(control.errors).toEqual({ cwSelectUnknownValue: { value: 'u5' } });
    });
  });
  describe('Given review findings (regression tests)', () => {
    const label = (el: HTMLElement | null) => el?.textContent?.trim();

    it('when the value is undefined, then it is treated as empty, not as an unknown value', async () => {
      const { fixture, control, combobox } = await setup();

      control.setValue(undefined as unknown as null);
      await fixture.whenStable();

      expect(control.valid).toBe(true);
      expect(combobox().hasAttribute('aria-invalid')).toBe(false);
      expect(combobox().textContent?.trim()).toBe('Any reviewer');
    });

    it('when Escape closes the list, then it does not also reach an enclosing dialog', async () => {
      const { root, combobox, press } = await setup();
      const outer: string[] = [];
      root.addEventListener('keydown', (e) => outer.push((e as KeyboardEvent).key));
      await press('ArrowDown');

      await press('Escape');
      expect(outer).toEqual(['ArrowDown']);
      expect(combobox().getAttribute('aria-expanded')).toBe('false');

      await press('Escape');
      expect(outer).toEqual(['ArrowDown', 'Escape']);
    });

    it('when there are no options, then navigation keys never point at a missing option', async () => {
      const { fixture, combobox, press } = await setup();
      fixture.componentInstance.options.set([]);
      await fixture.whenStable();

      await press('ArrowDown');
      expect(combobox().getAttribute('aria-expanded')).toBe('true');

      for (const key of ['Home', 'ArrowUp', 'End', 'ArrowDown']) {
        await press(key);
        expect(combobox().hasAttribute('aria-activedescendant'), key).toBe(false);
      }
    });

    it('when typing while closed on a value, then the search starts after the current value', async () => {
      const { control, activeOption, press } = await setup('u2');

      await press('a');

      expect(label(activeOption())).toBe('Aidan Brennan');
      expect(control.value).toBe('u2');
    });

    it('when a character is typed with AltGr, then typeahead still uses it', async () => {
      const { fixture, activeOption, press } = await setup();
      fixture.componentInstance.options.set([...OPTIONS, { value: 'u6', label: 'Łukasz Nowak' }]);
      await fixture.whenStable();

      await press('ł', { ctrlKey: true, altKey: true, modifierAltGraph: true } as KeyboardEventInit);

      expect(label(activeOption())).toBe('Łukasz Nowak');
    });

    it('when the control is disabled and its label is clicked, then the combobox does not take focus', async () => {
      const { fixture, root, control, combobox } = await setup();
      control.disable();
      await fixture.whenStable();

      root.querySelector<HTMLElement>(`#${combobox().getAttribute('aria-labelledby')}`)!.click();

      expect(document.activeElement).not.toBe(combobox());
      expect(control.touched).toBe(false);
    });
  });
});
