import { Fragment } from 'react';
import { Item } from '@astryxdesign/core/Item';
import { Text } from '@astryxdesign/core/Text';
import type { AgentSkill } from '@studio/events';
import { t } from '@studio/i18n';
import { MENU_PANEL } from '../menu/surface.js';
import type { SkillMatch } from './skillMatch.js';

export type SkillCatalog = 'unheard' | 'heard' | 'unavailable';

export interface SkillSuggestionsProps {
  matches: readonly SkillMatch[];
  highlighted: number;
  catalog: SkillCatalog;
  hasSkills: boolean;
  listId: string;
  onChoose: (skill: AgentSkill) => void;
  onHover: (index: number) => void;
  /** Said in the menu's place instead of the list, such as an unknown slash command (ONL-2744). */
  notice?: string;
}

const PANEL = { ...MENU_PANEL, maxHeight: 280, overflowY: 'auto' } as React.CSSProperties;
/* Tighter than the library's row so five skills show before the list scrolls (ONL-2744). */
const ROW = { paddingBlock: 'var(--spacing-1)' } as React.CSSProperties;
const NAME = { color: 'var(--color-text-primary)' } as React.CSSProperties;
const MARK = {
  backgroundColor: 'var(--color-background-teal)',
  color: 'var(--studio-teal-ink)',
  fontWeight: 700,
  borderRadius: 2,
  paddingInline: 1,
} as React.CSSProperties;
const SENTENCE = { display: 'block', padding: 'var(--spacing-2)' } as React.CSSProperties;
/** `isSelected` is the only route to `aria-selected`, and it fills with the accent this band refuses. */
/* Pulled up under the name: the library's description line sits a full leading below it (ONL-2744). */
const DESCRIPTION = { display: 'block', marginBlockStart: -3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties;
const ACTIVE_ROW = { ...ROW, backgroundColor: 'var(--color-background-gray)' } as React.CSSProperties;


function emptySentence(catalog: SkillCatalog, hasSkills: boolean): string {
  if (catalog === 'unheard') return t('chat.skills.starting');
  if (catalog === 'unavailable') return t('chat.skills.unavailable');
  return hasSkills ? t('chat.skills.noMatch') : t('chat.skills.none');
}

/** A description that wraps turns every row into a paragraph, so the catalog's own newlines go (ONL-2047). */
function oneLine(description: string): string {
  return description.replace(/\s+/g, ' ').trim();
}

function MarkedName({ parts }: { parts: SkillMatch['parts'] }): React.JSX.Element {
  return (
    <span style={NAME}>
      /
      {parts.map((part, index) => (
        <Fragment key={`${String(index)}-${part.text}`}>
          {part.isMatch ? <mark style={MARK} data-testid="chat-skill-match">{part.text}</mark> : part.text}
        </Fragment>
      ))}
    </span>
  );
}

/**
 * Props in, pixels out: no popover, no hook and no bridge, so the gallery can
 * render it in flow and the tests can read it as markup (ONL-2047).
 */
export function SkillSuggestions({ matches, highlighted, catalog, hasSkills, listId, onChoose, onHover, notice }: SkillSuggestionsProps): React.JSX.Element {
  return (
    <div role="listbox" id={listId} aria-label={t('chat.skills.control')} style={PANEL} data-testid="chat-skills-menu">
      {notice !== undefined ? (
        <Text size="sm" color="secondary" style={SENTENCE} data-testid="chat-skills-notice">{notice}</Text>
      ) : matches.length === 0 ? (
        <Text size="sm" color="secondary" style={SENTENCE}>{emptySentence(catalog, hasSkills)}</Text>
      ) : (
        matches.map((match, index) => (
          <Item
            key={match.skill.path ?? match.skill.name}
            role="option"
            // Stated and set: `Item` writes `aria-selected` from `isSelected` after it spreads rest props.
            aria-selected={index === highlighted}
            isSelected={index === highlighted}
            style={index === highlighted ? ACTIVE_ROW : ROW}
            label={<MarkedName parts={match.parts} />}
            labelLines={1}
            description={<span style={DESCRIPTION}>{oneLine(match.skill.description)}</span>}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
            onClick={() => onChoose(match.skill)}
            data-testid="chat-skill-option"
          />
        ))
      )}
    </div>
  );
}
