import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList';
import { IconButton } from '@astryxdesign/core/IconButton';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { withoutRecommended, type Question } from '@studio/events';
import { fill } from './fill.js';
import { questionNumberIndex } from './questionAnswers.js';
import { draftOf, goTo, next, openSheet, pick, sheetAnswers, sheetHeader, sheetInput, sheetKey, sheetSteps, writeNote, type SheetState } from './questionSheet.js';
import { fade, growHeight, SHEET_TIMING as T } from './questionSheetMotion.js';
import type { RespondToPermission } from './ToolApproval.js';
import type { QuestionSheetStrings } from './strings.js';

export type SheetPhase = 'opening' | 'open' | 'closing';

export interface QuestionSheetProps {
  questions: Question[];
  requestId: string;
  phase: SheetPhase;
  strings: QuestionSheetStrings;
  onRespond: RespondToPermission;
  onDismiss?: () => void;
  closeIcon: ReactNode;
  onOpened: () => void;
  onClosed: () => void;
  /** Called as the row starts to grow or fold, with how long the transcript should hold its end. */
  onResize?: (ms: number) => void;
}

const SHEET_CSS = `
.chat-question-card .chat-question-close { opacity: 0; }
.chat-question-card:hover .chat-question-close, .chat-question-card:focus-within .chat-question-close { opacity: 1; }
.chat-question-card .chat-question-numbers { opacity: 0; pointer-events: none; }
.chat-question-card [data-can-jump]:hover .chat-question-numbers, .chat-question-card [data-can-jump]:focus-within .chat-question-numbers { opacity: 1; pointer-events: auto; }
.chat-question-card [data-can-jump]:hover .chat-question-count, .chat-question-card [data-can-jump]:focus-within .chat-question-count { visibility: hidden; }
.chat-question-card .chat-question-number { width: 20px; min-width: 20px; height: 24px; min-height: 24px; padding-inline: 0; border-radius: 4px; font-variant-numeric: tabular-nums; }
.chat-question-card .chat-question-number[aria-current="step"] { pointer-events: none; }
.chat-question-card .chat-question-dismiss { width: 24px; min-width: 24px; height: 24px; min-height: 24px; border-radius: 4px; }
.chat-question-card .chat-question-key { border-end-end-radius: 6px; }
.chat-question-card [data-testid="question-option"] { cursor: pointer; }
.chat-question-card [data-testid="question-option"] > [data-align] { align-items: baseline; gap: 10px; padding: 0; min-height: 0; }
.chat-question-card [data-testid="question-option"] > [data-align] > span:first-child { margin-top: -18px; height: 18px; display: flex; align-items: center; align-self: baseline; font-size: 13px; transform: translateY(calc(9px - 0.5cap)); }
.chat-question-card [data-testid="question-option"] label { font-size: 13px; line-height: 18px; display: block; overflow: hidden; white-space: nowrap; text-overflow: clip; mask-image: linear-gradient(to right, black calc(100% - 28px), transparent); }
.chat-question-card [data-testid="question-option"] span[id] { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 12px; line-height: 16px; padding-top: 2px; color: var(--color-text-secondary); text-wrap: pretty; }
.chat-question-card [role="radiogroup"] { gap: 2px; }
.chat-question-card li[data-testid="question-option"] { align-items: baseline; gap: 10px; min-height: 0; }
.chat-question-card li[data-testid="question-option"] > span:first-child { margin-top: -18px; height: 18px; display: flex; align-items: center; align-self: baseline; font-size: 13px; transform: translateY(calc(9px - 0.5cap)); }
.chat-question-card li[data-testid="question-option"] > button { padding: 0; min-width: 0; flex: 1; text-align: start; }
.chat-question-card li[data-testid="question-option"] > button > span:first-child { display: block; font-size: 13px; line-height: 18px; overflow: hidden; white-space: nowrap; text-overflow: clip; mask-image: linear-gradient(to right, black calc(100% - 28px), transparent); }
.chat-question-card li[data-testid="question-option"] > button > span:nth-child(2) { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; white-space: normal; text-overflow: clip; font-size: 12px; line-height: 16px; padding-top: 2px; color: var(--color-text-secondary); text-wrap: pretty; }
.chat-question-card [data-sheet-note] [data-pressable-container] { background: transparent; border-color: transparent; box-shadow: none; padding-inline: 0; }
.chat-question-card [data-sheet-note] input { font-size: 13px; line-height: 18px; }
.chat-question-card [data-sheet-note] input::placeholder { color: var(--color-text-disabled); opacity: 1; }
.chat-question-card [data-sheet-note][data-fade="end"] [data-pressable-container] { mask-image: linear-gradient(to right, black calc(100% - 28px), transparent); }
.chat-question-card [data-sheet-note][data-fade="start"] [data-pressable-container] { mask-image: linear-gradient(to left, black calc(100% - 28px), transparent); }
`;

const HAIRLINE = 'var(--border-width) solid var(--color-border)';

type NoteFade = 'end' | 'start' | 'none';

function noteFade(input: HTMLInputElement): NoteFade {
  const overflows = input.scrollWidth > input.clientWidth + 1;
  if (document.activeElement === input) return input.scrollLeft > 0 ? 'start' : 'none';
  return overflows ? 'end' : 'none';
}

export function QuestionSheet({
  questions,
  requestId,
  phase,
  strings,
  onRespond,
  onDismiss,
  closeIcon,
  onOpened,
  onClosed,
  onResize,
}: QuestionSheetProps): ReactNode {
  const [state, setState] = useState<SheetState>(() => openSheet(requestId));
  const [isPending, setPending] = useState(false);
  const [fadeAt, setFadeAt] = useState<NoteFade>('none');
  const row = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const note = useRef<HTMLDivElement>(null);
  const isFocusOwed = useRef(false);
  const live = state.requestId === requestId ? state : openSheet(requestId);
  if (live !== state) setState(live);

  useLayoutEffect(() => {
    const strip = row.current;
    const surface = card.current;
    if (strip === null || surface === null || phase === 'open') return;
    const parts = Array.from(surface.querySelectorAll<HTMLElement>(':scope > [data-sheet-part]'));
    const height = strip.getBoundingClientRect().height;
    let fold: Animation | undefined;
    const running: Array<Animation | undefined> = [];
    if (phase === 'opening') {
      fold = growHeight(strip, 0, height, T.rowIn, { marginTop: [T.rowInFrom, 0] });
      running.push(fade(surface, 'in', T.cardIn, { rise: T.cardRise }));
      for (const part of parts) running.push(fade(part, 'in', T.contentsIn, { delay: T.contentsInDelay, rise: T.contentsRise }));
      onResize?.(T.rowIn + 50);
    } else {
      for (const part of parts) running.push(fade(part, 'out', T.contentsOut));
      running.push(fade(surface, 'out', T.cardOut, { delay: T.cardOutDelay }));
      fold = growHeight(strip, height, 0, T.rowOut, { fill: 'forwards' });
      onResize?.(T.rowOut + 250);
    }
    running.push(fold);
    let isCurrent = true;
    const done = phase === 'opening' ? onOpened : onClosed;
    if (fold === undefined) done();
    else void fold.finished.then(() => { if (isCurrent) done(); }, () => undefined);
    return () => {
      isCurrent = false;
      for (const animation of running) animation?.cancel();
    };
  }, [phase]);

  const question = questions[live.at];
  const key = sheetKey(live, questions);
  const isLocked = isPending || phase === 'closing';

  const send = (): void => {
    if (isLocked) return;
    const answers = sheetAnswers(questions, live);
    if (Object.keys(answers).length < questions.length) return;
    setPending(true);
    void Promise.resolve(onRespond(requestId, 'allow', answers, sheetInput(live), live.wentBack))
      .then((accepted) => { if (accepted !== true) setPending(false); }, () => setPending(false));
  };

  const press = (): void => {
    if (!key.isLit || isLocked) return;
    if (key.action === 'send') send();
    else {
      setFadeAt('none');
      setState((current) => next(current, questions));
    }
  };

  const jump = (at: number): void => {
    if (isLocked) return;
    setFadeAt('none');
    isFocusOwed.current = true;
    setState((current) => goTo(current, questions, at));
  };

  const choose = (label: string, input: 'tap' | 'number-key' = 'tap'): void => {
    if (isLocked) return;
    setState((current) => pick(current.requestId === requestId ? current : live, questions, label, input));
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      if (target !== null && card.current !== null && !card.current.contains(target) && target !== document.body) return;
      const isEditable = target?.closest('input[type="text"],input:not([type]),textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"]') != null;
      const index = questionNumberIndex(event, isEditable);
      const option = index === undefined ? undefined : question?.options[index];
      if (option === undefined) return;
      event.preventDefault();
      choose(option.label, 'number-key');
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  });

  useEffect(() => {
    if (!isFocusOwed.current) return;
    isFocusOwed.current = false;
    const options = card.current?.querySelector('[data-sheet-options]');
    const control = options?.querySelector<HTMLElement>('input:checked, [aria-checked="true"]') ?? options?.querySelector<HTMLElement>('input, button');
    control?.focus({ preventScroll: true });
  }, [live.at]);

  useEffect(() => {
    const input = note.current?.querySelector('input');
    if (input == null) return;
    const read = (): void => setFadeAt(noteFade(input));
    const leave = (): void => {
      input.scrollLeft = 0;
      read();
    };
    const listening = new AbortController();
    for (const name of ['input', 'scroll', 'focus', 'keyup', 'select'] as const) input.addEventListener(name, read, { signal: listening.signal });
    input.addEventListener('blur', leave, { signal: listening.signal });
    read();
    return () => listening.abort();
  }, [live.at]);

  if (question === undefined) return null;
  const draft = draftOf(live, question);
  const hasCount = sheetHeader(questions.length) === 'count';
  const steps = hasCount ? sheetSteps(live, questions) : [];
  const canJump = steps.some((step) => step.isOpen);
  const close = onDismiss ? (
    <span className="chat-question-close" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: hasCount ? 16 : 20 }}>
      <IconButton className="chat-question-dismiss" label={strings.dismiss} tooltip={strings.dismiss} icon={closeIcon} variant="ghost" size="sm" isDisabled={isLocked} onClick={onDismiss} data-testid="question-dismiss" />
    </span>
  ) : null;

  return (
    <div ref={row} className="chat-question-sheet" data-testid="question-sheet" data-phase={phase} data-request-id={requestId} style={{ width: '100%', overflow: 'clip', overflowClipMargin: 3 }}>
      <style href="chat-question-sheet" precedence="medium">{SHEET_CSS}</style>
      <div ref={card} className="chat-question-card" data-testid="question-sheet-card" style={{ border: HAIRLINE, borderRadius: 12, overflow: 'hidden', boxSizing: 'border-box' }}>
        {hasCount ? (
          <div data-sheet-part data-testid="question-steps" {...(canJump ? { 'data-can-jump': '' } : {})} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px 0 14px' }}>
            <span style={{ display: 'grid', flex: 'none' }}>
              <Text className="chat-question-count" type="supporting" size="sm" color="secondary" hasTabularNumbers style={{ gridArea: '1 / 1' }}>
                {fill(strings.step, { at: String(live.at + 1), total: String(questions.length) })}
              </Text>
              {canJump ? (
                <span className="chat-question-numbers" style={{ gridArea: '1 / 1', display: 'flex', alignItems: 'center', gap: 4, height: 20, marginInlineStart: -6 }}>
                  {steps.map((step) => (
                    <Button
                      key={step.at}
                      className="chat-question-number"
                      label={String(step.at + 1)}
                      aria-label={fill(strings.goToQuestion, { n: String(step.at + 1) })}
                      {...(step.isCurrent ? { 'aria-current': 'step' as const, tabIndex: -1 } : {})}
                      size="sm"
                      variant="ghost"
                      isDisabled={isLocked || (!step.isCurrent && !step.isOpen)}
                      {...(step.isOpen && step.hint !== undefined ? { tooltip: step.hint } : {})}
                      onClick={() => jump(step.at)}
                      style={{ color: step.isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                      data-testid="question-number"
                    />
                  ))}
                </span>
              ) : null}
            </span>
            <span style={{ flex: 1, minWidth: 0 }} />
            {close}
          </div>
        ) : null}
        <div data-sheet-part>
          <Text
            type="body"
            weight="medium"
            textWrap="pretty"
            style={{ display: 'block', paddingInline: 14, paddingBlock: hasCount ? '10px 8px' : '12px 8px', fontSize: 14, lineHeight: '20px' }}
            data-testid="question-text"
          >
            {hasCount || close === null ? null : <span style={{ float: 'right', marginInline: '12px -6px', marginBlockStart: -2 }}>{close}</span>}
            {question.question}
          </Text>
          <Options question={question} picks={draft.picks} isDisabled={isLocked} onPick={choose} />
        </div>
        <div data-sheet-part style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, borderTop: HAIRLINE, paddingBlock: 6, paddingInline: '14px 6px' }}>
          <div ref={note} data-sheet-note data-fade={fadeAt} style={{ flex: 1, minWidth: 0 }}>
            <TextInput
              key={live.at}
              label={question.question}
              isLabelHidden
              size="sm"
              value={draft.text}
              placeholder={strings.ownWords}
              isDisabled={isLocked}
              onChange={(text) => setState((current) => writeNote(current, questions, text))}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.repeat) return;
                event.preventDefault();
                press();
              }}
              data-testid="question-note"
            />
          </div>
          <Button
            label={key.action === 'send' ? strings.send : strings.next}
            size="sm"
            variant="primary"
            isDisabled={!key.isLit || isLocked}
            onClick={press}
            data-testid={key.action === 'send' ? 'question-send' : 'question-next'}
            className="chat-question-key"
          />
        </div>
      </div>
    </div>
  );
}

function rowStyle(): React.CSSProperties {
  return { borderRadius: 8, paddingBlock: '10px 12px', paddingInline: 10 };
}

function Options({ question, picks, isDisabled, onPick }: { question: Question; picks: string[]; isDisabled: boolean; onPick: (label: string) => void }): ReactNode {
  const style = { paddingInline: 4, display: 'flex', flexDirection: 'column', gap: 2 } as const;
  if (question.multiSelect === true) {
    return (
      <div data-sheet-options style={style}>
        <CheckboxList
          label={question.question}
          isLabelHidden
          value={picks}
          isDisabled={isDisabled}
          onChange={(values) => {
            const toggled = values.find((value) => !picks.includes(value)) ?? picks.find((value) => !values.includes(value));
            if (toggled !== undefined) onPick(toggled);
          }}
          density="compact"
        >
          {question.options.map((option) => (
            <CheckboxListItem key={option.label} value={option.label} label={withoutRecommended(option.label)} {...(option.description ? { description: option.description } : {})} style={rowStyle()} data-testid="question-option" data-value={option.label} data-selected={picks.includes(option.label) ? 'true' : undefined} />
          ))}
        </CheckboxList>
      </div>
    );
  }
  return (
    <div data-sheet-options style={style}>
      <RadioList label={question.question} isLabelHidden size="sm" value={picks[0] ?? ''} isDisabled={isDisabled} onChange={onPick}>
        {question.options.map((option) => (
          <RadioListItem key={option.label} value={option.label} label={withoutRecommended(option.label)} {...(option.description ? { description: option.description } : {})} style={rowStyle()} onClick={() => onPick(option.label)} data-testid="question-option" data-value={option.label} data-selected={picks.includes(option.label) ? 'true' : undefined} />
        ))}
      </RadioList>
    </div>
  );
}
