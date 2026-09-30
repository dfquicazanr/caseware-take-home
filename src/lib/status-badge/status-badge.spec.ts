import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { StatusBadge, StatusBadgeSize, StatusBadgeTone } from './status-badge';

/*
 * Tested through what a consumer renders and what assistive technology gets.
 * Colour itself is covered by `npm run check:contrast`, not here.
 */

@Component({
  imports: [StatusBadge],
  template: `<cw-status-badge
    [label]="label()"
    [tone]="tone()"
    [size]="size()"
    [tooltip]="tooltip()"
  />`,
})
class ModernHost {
  readonly label = input('Ready');
  readonly tone = input<StatusBadgeTone | undefined>(undefined);
  readonly size = input<StatusBadgeSize | undefined>(undefined);
  readonly tooltip = input('');
}

@Component({
  imports: [StatusBadge],
  template: `
    <cw-status-badge
      [label]="'Ready'"
      [isReady]="isReady()"
      [isProcessing]="isProcessing()"
      [isError]="isError()"
      [isSmall]="isSmall()"
      [isLarge]="isLarge()"
    />
  `,
})
class LegacyHost {
  readonly isReady = input(false);
  readonly isProcessing = input(false);
  readonly isError = input(false);
  readonly isSmall = input(false);
  readonly isLarge = input(false);
}

@Component({
  imports: [StatusBadge],
  template: `
    <cw-status-badge label="Ready" [isReady]="true" />
    <cw-status-badge label="Ready" [isReady]="true" />
  `,
})
class LegacyListHost {}

async function render<T>(host: new () => T, inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ imports: [host] });
  const fixture = TestBed.createComponent(host);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('cw-status-badge')!;
}

/** Text a screen reader can reach: everything not inside aria-hidden. */
function accessibleText(el: HTMLElement): string {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let text = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest('[aria-hidden="true"]')) text += node.textContent;
  }
  return text.replace(/\s+/g, ' ').trim();
}

/** The rendered result a user sees, without Angular's per-instance attributes. */
function rendering(el: HTMLElement): string {
  return el.outerHTML.replace(/ _ng\w+-[\w-]+(="")?/g, '').replace(/<!--.*?-->/g, '');
}

describe('cw-status-badge', () => {
  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => vi.restoreAllMocks());

  describe('Given a label', () => {
    it('then assistive technology can read it', async () => {
      const badge = await render(ModernHost, { label: 'Processing' });

      expect(accessibleText(badge)).toBe('Processing');
    });

    it('when it has a tooltip, then the tooltip is also readable, not only on hover', async () => {
      const badge = await render(ModernHost, {
        label: 'Processing',
        tooltip: 'The server is still preparing this engagement',
      });

      expect(accessibleText(badge)).toBe(
        'Processing, The server is still preparing this engagement',
      );
      expect(badge.getAttribute('title')).toBe('The server is still preparing this engagement');
    });
  });

  describe('Given the deprecated boolean inputs (ADR 0006)', () => {
    const cases: [Record<string, boolean>, Record<string, string>][] = [
      [{ isReady: true }, { tone: 'success' }],
      [{ isProcessing: true }, { tone: 'warning' }],
      [{ isError: true }, { tone: 'danger' }],
      [{ isReady: true, isError: true }, { tone: 'danger' }],
      [{ isSmall: true }, { size: 'sm' }],
      [{ isLarge: true }, { size: 'lg' }],
    ];

    for (const [legacy, modern] of cases) {
      it(`when ${JSON.stringify(legacy)} is used, then it renders exactly like ${JSON.stringify(modern)}`, async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const legacyBadge = rendering(await render(LegacyHost, legacy));
        TestBed.resetTestingModule();
        const modernBadge = rendering(await render(ModernHost, modern));

        expect(legacyBadge).toBe(modernBadge);
      });
    }

    it('when several badges use one, then a single dev-mode warning names the replacement', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await render(LegacyListHost);

      const messages = warn.mock.calls
        .map((call) => String(call[0]))
        .filter((m) => m.includes('isReady'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('tone="success"');
    });
  });
});
