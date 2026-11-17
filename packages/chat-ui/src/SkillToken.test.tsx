import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SkillToken } from './SkillToken.js';

const skill = { name: 'brand-audit', description: 'Check the palette and type.', agent: 'claude' } as const;

it('reads as the command it ran, with the accent fact a recording can assert', () => {
  const markup = renderToStaticMarkup(<SkillToken skill={skill} testId="chat-skill-token" />);

  expect(markup).toContain('/brand-audit');
  expect(markup).toContain('data-testid="chat-skill-token"');
  expect(markup).toContain('data-skill-accent="teal"');
  // The categorical teal, not the accent: the transcript re-points every accent var to grey.
  expect(markup).toContain('var(--color-text-teal)');
});
