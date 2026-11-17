import { useEffect, useId, useRef, useState, type Dispatch, type KeyboardEvent, type ReactNode, type RefObject, type SetStateAction } from 'react';
import { t } from '@studio/i18n';
import { usePopover } from '@astryxdesign/core/Popover';
import { layerAnimations } from '@astryxdesign/core/Layer';
import type { ChatComposerInputHandle } from '@astryxdesign/core/Chat';
import { skillMentionRange, type AgentSkill, type HarnessId, type SkillAttachment } from '@studio/events';
import { ignoreRefusal } from '../refusal.js';
import { skillMenuQuery, skillQueryStart, unknownSkillCommand } from './skillComposerState.js';
import { matchSkills, promoteTypedSkill, resolveSkillMenuKey } from './skillMatch.js';
import { SkillToken } from '@studio/chat-ui';
import { announceComposerEdit, composerEditable, findSkillToken, removeSkillToken, selectSerialized, skillTokenValue } from './skillTokenDom.js';
import { SkillSuggestions, type SkillCatalog } from './SkillSuggestions.js';
import { studio } from '../bridge.js';

type SkillStanding = 'unheard' | 'present' | 'gone';

export interface SkillComposerOptions {
  text: string;
  /** The editable the token is placed into; it serializes back to `/name` where the token sits. */
  input: RefObject<ChatComposerInputHandle | null>;
  agent: HarnessId;
  skills: readonly AgentSkill[];
  heard: boolean;
  unavailable: boolean;
  disabled: boolean;
  initialSkill?: SkillAttachment;
  /** The attach notice clears when the user acts; choosing or dropping a skill is acting (ONL-2409). */
  onActed?: () => void;
}

export interface SkillComposerHandle {
  selected: SkillAttachment | undefined;
  setSelected: Dispatch<SetStateAction<SkillAttachment | undefined>>;
  removeSkill: () => void;
  standing: SkillStanding;
  unknown: boolean;
  onKeyDown: (event: KeyboardEvent) => boolean;
  onTextChange: (value: string) => void;
  onSendSettled: () => void;
  /** A send that did not land keeps the draft, so its token goes back in. */
  onSendFailed: () => void;
  layer: ReactNode;
  composerRootRef: (element: HTMLDivElement | null) => void;
}

/* Inset from the composer's edges so the menu reads as its own surface, with a floor for a narrow chat (ONL-2744). */
const MENU_INSET = 6;
const LAYER = {
  width: `calc(anchor-size(width) - ${String(2 * MENU_INSET)}px)`,
  minWidth: 240,
  marginInlineStart: MENU_INSET,
} as React.CSSProperties;

export function useSkillComposer(options: SkillComposerOptions): SkillComposerHandle {
  const { text, input, agent, skills, heard, unavailable, disabled, initialSkill, onActed } = options;
  const [selected, setSelected] = useState<SkillAttachment | undefined>(initialSkill);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const listId = useId();
  const root = useRef<HTMLDivElement | null>(null);
  const placing = useRef(false);
  // A send clears the editable before its skill settles; the token must not come back into it.
  const sending = useRef(false);
  // A render, so the re-place effect runs once the send guard lifts.
  const [, setRetry] = useState(0);
  const seen = useRef<SkillAttachment | undefined>(undefined);
  const query = skillMenuQuery(text);
  const isOpen = !disabled && isMenuOpen;
  const matches = matchSkills(query ?? '', agent, skills);
  const highlighted = matches.length === 0 ? -1 : Math.min(cursor, matches.length - 1);
  const catalog: SkillCatalog = unavailable ? 'unavailable' : heard ? 'heard' : 'unheard';
  const standing: SkillStanding = selected === undefined
    ? 'present'
    : !heard
      ? 'unheard'
      : skills.some((skill) => skill.agent === selected.agent && skill.agent === agent && skill.name === selected.name && skill.path === selected.path)
        ? 'present'
        : 'gone';
  const unknown = !isOpen && unknownSkillCommand(text, agent, skills, heard);

  const popover = usePopover({
    role: 'none',
    hasAutoFocus: false,
    hasCloseButton: false,
    hasSurface: false,
    hasLightDismiss: true,
    onHide: () => { setMenuOpen(false); },
  });

  useEffect(() => { setCursor(0); }, [query, agent]);
  // An unknown command says so in the menu's own place, not in a band under the input (ONL-2744).
  const isShown = isOpen || unknown;
  useEffect(() => {
    if (isShown) popover.show();
    else popover.hide();
  }, [isShown, popover]);

  useEffect(() => {
    if (!isOpen) return;
    let canceled = false;
    let refreshing = false;
    const refresh = async () => {
      if (canceled || refreshing) return;
      refreshing = true;
      try { await studio().agentCommand({ type: 'skills.refresh' }).catch(ignoreRefusal('skills', 'skills refresh')); }
      finally { refreshing = false; }
    };
    const timer = setInterval(() => { void refresh(); }, 3000);
    void refresh();
    return () => { canceled = true; clearInterval(timer); };
  }, [isOpen, agent]);

  const close = (): void => { setMenuOpen(false); };
  const openMenu = (): void => {
    setMenuOpen(true);
    setCursor(0);
    studio().telemetryEvent({ event: 'skill_menu_opened', properties: { item_kind: 'skill', agent, source: 'slash' } });
  };

  /** Replaces the serialized `start..end` with the skill's token, so it sits exactly where the slash was typed. */
  const place = (skill: AgentSkill, start: number, end: number, takesFocus: boolean, emits: boolean): void => {
    const editable = composerEditable(root.current);
    const handle = input.current;
    if (editable === null || handle === null) return;
    // A restore must not pull focus or the caret out of whatever the designer is in.
    const focused = document.activeElement;
    const selection = window.getSelection();
    const kept = !takesFocus && selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : undefined;
    if (takesFocus) editable.focus();
    selectSerialized(editable, start, end);
    const id = handle.insertToken({ value: skillTokenValue(skill.name), render: () => <SkillToken skill={skill} testId="chat-skill-token" /> });
    if (!takesFocus && focused !== editable) {
      selection?.removeAllRanges();
      if (kept !== undefined) selection?.addRange(kept);
      if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
    }
    if (id === undefined || !emits) return;
    // The edit this announces is the token itself, which must not be read as a typed `/name` again.
    placing.current = true;
    try { announceComposerEdit(editable); }
    finally { placing.current = false; }
  };

  const take = (skill: AgentSkill, start: number, end: number): void => {
    setSelected({ ...skill, kind: 'skill' });
    place(skill, start, end, true, true);
    close();
    onActed?.();
    studio().telemetryEvent({ event: 'skill_chosen', properties: { item_kind: 'skill', agent } });
  };

  // A restored draft or a recalled prompt arrives as plain text: the library writes `textContent`
  // and never calls a trigger's `deserialize` at 0.1.9. Runs after that write, a child's effect.
  useEffect(() => {
    if (selected !== seen.current) sending.current = false;
    seen.current = selected;
    if (selected === undefined || sending.current) return;
    const editable = composerEditable(root.current);
    if (editable === null || findSkillToken(editable, selected.name) !== null) return;
    const value = input.current?.getValue() ?? text;
    // Where its `/name` stands, or in front for a prompt sent before the token sat inline.
    const at = skillMentionRange(value, selected.name);
    const end = at === undefined ? 0 : /\s/.test(value.charAt(at.end)) ? at.end + 1 : at.end;
    // Silent unless the draft is otherwise empty: an edit would end a recall walk or a restore pass,
    // and only an empty one leaves the library's placeholder over the token.
    place(selected, at?.start ?? 0, end, false, value.trim() === '');
  });

  const removeSkill = (): void => {
    const editable = composerEditable(root.current);
    if (selected !== undefined && editable !== null && removeSkillToken(editable, selected.name)) announceComposerEdit(editable);
    setSelected(undefined);
    onActed?.();
  };

  const onTextChange = (value: string): void => {
    if (placing.current) return;
    if (value !== '') sending.current = false;
    // The token is the skill: deleting it, by Backspace or a cut, drops the skill with it.
    const editable = composerEditable(root.current);
    if (selected !== undefined && editable !== null && findSkillToken(editable, selected.name) === null) {
      setSelected(undefined);
      onActed?.();
    }
    const typed = selected === undefined ? promoteTypedSkill(value, agent, skills) : undefined;
    if (typed !== undefined) {
      take(typed.skill, 0, value.length - typed.text.length);
      return;
    }
    // One skill per message: with one chosen, a later slash is just text (ONL-2744).
    const next = selected === undefined ? skillMenuQuery(value) : undefined;
    if (next !== undefined) {
      if (!isMenuOpen) openMenu();
      return;
    }
    if (isMenuOpen) close();
  };

  const onKeyDown = (event: KeyboardEvent): boolean => {
    const result = resolveSkillMenuKey({
      key: event.key,
      shiftKey: event.shiftKey,
      isComposing: event.nativeEvent.isComposing,
      keyCode: event.nativeEvent.keyCode,
      isOpen,
      highlighted: highlighted >= 0,
    });
    switch (result.verdict) {
      case 'close':
        close();
        break;
      case 'move-up':
      case 'move-down': {
        const step = result.verdict === 'move-down' ? 1 : -1;
        setCursor(matches.length === 0 ? 0 : (Math.max(highlighted, 0) + step + matches.length) % matches.length);
        break;
      }
      case 'choose': {
        const match = matches[highlighted];
        if (match !== undefined) take(match.skill, skillQueryStart(text) ?? text.length, text.length);
        break;
      }
      case 'ignore':
        break;
    }
    return result.consume;
  };

  const layer = popover.render(
    <SkillSuggestions
      matches={matches}
      highlighted={highlighted}
      catalog={catalog}
      hasSkills={skills.some((skill) => skill.agent === agent)}
      listId={listId}
      onChoose={(skill) => { take(skill, skillQueryStart(text) ?? text.length, text.length); }}
      onHover={setCursor}
      {...(unknown ? { notice: t('chat.skills.unknown') } : {})}
    />,
    { placement: 'above', alignment: 'start', style: LAYER, xstyle: layerAnimations.above },
  );

  return {
    selected,
    setSelected,
    removeSkill,
    standing,
    unknown,
    onKeyDown,
    onTextChange,
    onSendSettled: () => {
      sending.current = true;
      close();
    },
    onSendFailed: () => {
      sending.current = false;
      setRetry((count) => count + 1);
    },
    layer: isShown ? layer : null,
    composerRootRef: (element) => {
      root.current = element;
      popover.triggerRef(element);
    },
  };
}
