import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { HarnessId } from '@studio/events';
import { effortLevelsFor } from './derive.js';
import { MODEL_CATALOGS } from './fixtures.js';
import { READINESS, type Readiness } from './readiness.js';
import { DefaultAgentRow, effortSelectorFor, modelSelectorFor } from './rows.js';

describe('DefaultAgentRow', () => {
  const labels: Record<Readiness, string> = {
    ready: 'Ready',
    'not-installed': 'Not installed',
    'not-signed-in': 'Not signed in',
    'sign-in-incomplete': 'Not finished',
    'needs-attention': 'Needs attention',
    checking: 'Checking…',
  };

  for (const agent of ['claude', 'codex'] as const satisfies readonly HarnessId[]) {
    for (const readiness of READINESS) {
      if (agent === 'codex' && readiness === 'sign-in-incomplete') continue;
      it(`${agent} ${readiness} shows its status and action`, () => {
        const markup = renderToStaticMarkup(createElement(DefaultAgentRow, {
          value: agent,
          readiness: { claude: 'sign-in-incomplete', codex: 'not-signed-in', opencode: 'ready', freebuff: 'ready', [agent]: readiness },
          onChange: () => {},
          onSetUp: () => {},
        }));
        expect(markup).toContain(`data-readiness="${readiness}"`);
        expect(markup).toContain(labels[readiness]);
        const button = markup.match(/<button\b[^>]*data-testid="settings-agent-setup"[^>]*>[\s\S]*?<\/button>/)?.[0];
        if (readiness === 'ready') {
          expect(button).toBeUndefined();
          return;
        }
        expect(button).toBeDefined();
        const action = agent === 'claude' && readiness === 'not-signed-in'
          ? 'Sign in with Claude'
          : agent === 'claude' && readiness === 'sign-in-incomplete'
            ? 'Continue sign-in'
            : 'Set up';
        expect(button).toContain(action);
        expect(/\sdisabled(?:=|\s|>)/.test(button!)).toBe(readiness === 'checking');
      });
    }
  }
});

describe('modelSelectorFor', () => {
  it('a stored model the catalog no longer lists still shows', () => {
    const view = modelSelectorFor('claude-opus-3-7', MODEL_CATALOGS.codex);
    expect(view.selected).toBe('claude-opus-3-7');
    expect(view.choices.map((choice) => choice.value)).toContain('claude-opus-3-7');
  });
});

describe('effortSelectorFor', () => {
  it('an unknown level shows its wire value', () => {
    const levels = [...effortLevelsFor(MODEL_CATALOGS.codex, 'gpt-5.6'), 'turbo'];
    const view = effortSelectorFor('xhigh', levels);
    expect(view.choices.find((choice) => choice.value === 'turbo')?.label).toBe('turbo');
  });
});
