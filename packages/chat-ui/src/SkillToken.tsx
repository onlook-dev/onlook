import type { AgentSkill } from '@studio/events';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';

/** The editable's own type and baseline: a highlight on the words, not a chip beside them. */
const TOKEN = {
  display: 'inline',
  padding: '0 var(--spacing-0-5)',
  borderRadius: 'var(--radius-element)',
  background: 'var(--color-background-teal)',
  color: 'var(--color-text-teal)',
  whiteSpace: 'nowrap',
  // Tight to the glyphs: the composer's 22px line would otherwise fill the whole row.
  lineHeight: 'normal',
} as React.CSSProperties;

const CARD = { display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 360, whiteSpace: 'normal' } as React.CSSProperties;

/** The categorical teal, not the accent: the transcript re-points `--color-accent` to grey (ONL-2047). */
export function SkillToken({ skill, testId }: { skill: AgentSkill; testId: string }): React.JSX.Element {
  return (
    <Tooltip
      placement="above"
      delay={0}
      hasHoverIndication={false}
      content={
        <span style={CARD} data-tooltip-rich="true">
          <Text color="secondary">/{skill.name}</Text>
          {skill.description ? <Text>{skill.description}</Text> : null}
        </span>
      }
    >
      <span style={TOKEN} data-testid={testId} data-skill-accent="teal">/{skill.name}</span>
    </Tooltip>
  );
}
