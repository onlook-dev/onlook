import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AgentSkill } from '@studio/events';
import { SkillSuggestions, type SkillCatalog } from './SkillSuggestions.js';
import { matchSkills } from './skillMatch.js';
import { t } from '@studio/i18n';

const SKILLS: AgentSkill[] = [
  { name: 'brand-audit', description: 'Check the palette and type.', agent: 'claude' },
  { name: 'brand-guidelines', description: 'Apply the guidelines.', agent: 'claude' },
  { name: 'button-states', description: 'Review every control state.', agent: 'claude' },
];

function markup(query: string, highlighted = 0, catalog: SkillCatalog = 'heard', skills = SKILLS): string {
  return renderToStaticMarkup(
    <SkillSuggestions
      matches={matchSkills(query, 'claude', skills)}
      highlighted={highlighted}
      catalog={catalog}
      hasSkills={skills.some((skill) => skill.agent === 'claude')}
      listId="skills"
      onChoose={() => undefined}
      onHover={() => undefined}
    />,
  );
}

const rows = (html: string): number => html.split('data-testid="chat-skill-option"').length - 1;

describe('SkillSuggestions', () => {
  it('renders one row per match and marks only the highlighted one selected', () => {
    const html = markup('', 1);
    expect(rows(html)).toBe(3);
    expect(html.split('aria-selected="true"').length - 1).toBe(1);
    expect(html.indexOf('aria-selected="true"')).toBeGreaterThan(html.indexOf('brand-audit'));
    expect(html.indexOf('aria-selected="true"')).toBeLessThan(html.indexOf('button-states'));
  });

  it('puts the matched characters inside a mark and leaves the rest out of it', () => {
    const html = markup('br');
    expect(html).toContain('<mark');
    expect(html).toMatch(/<mark[^>]*>br<\/mark>/);
    expect(html).not.toMatch(/<mark[^>]*>brand-audit<\/mark>/);
    expect(html).toContain('and-audit');
    expect(html).toContain('color:var(--color-text-primary)');
    expect(html).not.toContain('color:var(--color-text-teal)');
  });

  it('says which of four things is true rather than looking empty', () => {
    const sentences = [
      { html: markup('zzz'), says: t('chat.skills.noMatch') },
      { html: markup('', 0, 'heard', []), says: t('chat.skills.none') },
      { html: markup('', 0, 'unavailable', []), says: t('chat.skills.unavailable') },
      { html: markup('', 0, 'unheard', []), says: t('chat.skills.starting') },
    ];
    for (const { html, says } of sentences) {
      expect(html).toContain(says);
      expect(rows(html)).toBe(0);
    }
    expect(new Set(sentences.map((entry) => entry.says)).size).toBe(4);
  });

  it('does not claim a catalog is empty while the session is still reporting', () => {
    expect(markup('', 0, 'unheard', [])).not.toContain(t('chat.skills.none'));
  });

  it('keeps a description with a newline on one line', () => {
    const wrapped: AgentSkill[] = [{ name: 'brand-audit', description: 'Check the palette\nand the type.', agent: 'claude' }];
    const html = markup('', 0, 'heard', wrapped);
    expect(html).toContain('Check the palette and the type.');
    expect(html).not.toContain('Check the palette\nand the type.');
  });
});
