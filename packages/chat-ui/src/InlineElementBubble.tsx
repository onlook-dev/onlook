import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  ChatComposer,
  ChatComposerInput,
  type ChatComposerInputHandle,
  ChatSendButton,
} from '@astryxdesign/core/Chat';
import type { ComposerStatus } from './ChatPanel.js';
import { ShimmerText } from './ShimmerText.js';
import { resolveComposerEnter } from './composerSubmission.js';
import type { InlineElementBubbleStrings } from './strings.js';

export type InlineElementBubbleSurface = 'layer' | 'inline';

export interface InlineBubbleSendState {
  draft: string;
  isSessionUsable: boolean;
  /** An attachment the bubble holds, never an element chip: a chip is the prompt's subject, not its request (ONL-2455). */
  hasPayload: boolean;
}

export interface InlineBubbleKeyState extends InlineBubbleSendState {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
}

export type InlineBubbleSendVerdict = 'ignore' | 'send';

export type InlineBubbleKeyVerdict = InlineBubbleSendVerdict | 'dismiss';

/** Both send paths read this gate (ONL-2455). */
export function inlineBubbleSendVerdict(state: InlineBubbleSendState): InlineBubbleSendVerdict {
  return resolveComposerEnter({
    key: 'Enter',
    shiftKey: false,
    isComposing: false,
    keyCode: 13,
    isConnected: state.isSessionUsable,
    text: state.draft,
    hasPayload: state.hasPayload,
  });
}

export function resolveInlineBubbleKey(state: InlineBubbleKeyState): InlineBubbleKeyVerdict {
  if (state.key === 'Escape') return 'dismiss';
  return resolveComposerEnter({
    key: state.key,
    shiftKey: state.shiftKey,
    isComposing: state.isComposing,
    keyCode: state.keyCode,
    isConnected: state.isSessionUsable,
    text: state.draft,
    hasPayload: state.hasPayload,
  });
}

export interface InlineElementBubbleProps {
  strings: InlineElementBubbleStrings;
  /** A send that never reached the session leaves it standing. */
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (text: string) => void;
  onDismiss: () => void;
  /** The app's own `ChatComposerDrawer` composition, so one chip implementation serves both surfaces. */
  drawer?: ReactNode;
  /** The send glyph. The design draws a right arrow where the registry resolves `arrowUp`. */
  sendIcon?: ReactNode;
  /** The band below the body: a refused gather, a failed send, or a prompt waiting in the pen (ONL-2294). */
  status?: ComposerStatus;
  /** Resolve with `isComposerConnected` — the one definition of a usable composer. */
  isSessionUsable?: boolean;
  /** An attachment held in the drawer, which sends with no text (ONL-2549). */
  hasComposerPayload?: boolean;
  /** Required, not defaulted: a gallery that inherits `layer` stacks every story in the top layer at once (ONL-2455). */
  surface: InlineElementBubbleSurface;
  isCollapsed?: boolean;
  /** Offered, the composer calls it for a paste into its own editable and for nothing else (ONL-2549). */
  onFiles?: (files: File[]) => void;
  /** The layer's box, which a shrink-to-fit top layer cannot supply itself. */
  width?: CSSProperties['width'];
}

/** Inline: `ChatSendButton`'s class never reaches the DOM (@astryxdesign/core 0.1.9); mirrors `ChatPanel`'s pair, whose note covers the quiet one. */
const SEND_BUTTON_CIRCLE = {
  borderRadius: 'var(--radius-full)',
} as const;

const SEND_BUTTON_QUIET = {
  ...SEND_BUTTON_CIRCLE,
  backgroundColor: 'var(--color-background-muted)',
  color: 'var(--color-icon-secondary)',
} as const;

const INPUT_MAX_ROWS = 4;
/** Only a hand-driven scroll shows the scrollbar; a caret that scrolls to a new line does not. */
const SCROLLBAR_IDLE_MS = 800;
/** Past the row gap, so a draft at the wrap point cannot flip back and forth every render. */
const MULTILINE_EXIT_MARGIN_PX = 24;

/** A resting hint: a narrow crest and a pause between passes; the working rows' default read too fast. */
const INLINE_PLACEHOLDER_PERIOD_CH = 36;
const INLINE_PLACEHOLDER_CREST_CH = 5;
const INLINE_PLACEHOLDER_SWEEP_MS = 6000;

export function InlineElementBubble({
  strings,
  draft,
  onDraftChange,
  onSubmit,
  onDismiss,
  drawer,
  sendIcon,
  status,
  isSessionUsable = true,
  hasComposerPayload = false,
  surface,
  isCollapsed = false,
  onFiles,
  width = 280,
}: InlineElementBubbleProps): React.JSX.Element {
  const inputRef = useRef<ChatComposerInputHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollIdle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set on the DOM, not in state: a wheel tick must not re-render the bubble.
  const onInputWheel = (event: React.WheelEvent<HTMLDivElement>): void => {
    const input = event.currentTarget;
    input.dataset['scrolling'] = 'true';
    clearTimeout(scrollIdle.current);
    scrollIdle.current = setTimeout(() => {
      delete input.dataset['scrolling'];
    }, SCROLLBAR_IDLE_MS);
  };
  useEffect(() => () => clearTimeout(scrollIdle.current), []);
  // Only `layer` focuses: a still life mounts every state at once, and each focus scrolls its own story into view (ONL-2455).
  const opensFocused = surface === 'layer' && !isCollapsed;
  useEffect(() => {
    if (!opensFocused) return;
    inputRef.current?.focus();
    // Chromium's programmatic focus places no caret in a contenteditable; seat it at the draft's end.
    const editable = rootRef.current?.querySelector<HTMLElement>('[contenteditable="true"]');
    const selection = document.getSelection();
    if (editable === null || editable === undefined || selection === null) return;
    const range = document.createRange();
    range.selectNodeContents(editable);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [opensFocused]);

  // Sticky until the draft fits the single row again, so a widened input cannot unwrap it back and flap.
  const [isMultiline, setIsMultiline] = useState(false);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const editable = root?.querySelector<HTMLElement>('[contenteditable]');
    if (root === null || editable === null || editable === undefined) return;
    const measure = (): void => {
      if (draft.length === 0) {
        setIsMultiline(false);
        return;
      }
      const lineHeight = Number.parseFloat(getComputedStyle(editable).lineHeight);
      const range = document.createRange();
      range.selectNodeContents(editable);
      const text = range.getBoundingClientRect();
      const isOneLine = !draft.includes('\n') && text.height < lineHeight * 1.5;
      setIsMultiline((wasMultiline) => {
        if (!wasMultiline) return !isOneLine;
        const send = root.querySelector<HTMLElement>('[data-testid="inline-element-bubble-send"]');
        const style = getComputedStyle(editable);
        const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
        const room =
          editable.clientWidth - padding - (send?.offsetWidth ?? 0) - MULTILINE_EXIT_MARGIN_PX;
        return !(isOneLine && text.width <= room);
      });
    };
    measure();
    // A draft that arrives with the surface reaches the editable after this render, so the one-shot read saw no text to wrap (ONL-2518).
    const observer = new ResizeObserver(measure);
    observer.observe(editable);
    return () => observer.disconnect();
    // `draft`, not the editable alone: deleting inside an already-wrapped row resizes nothing, and that is the keystroke the exit is waiting for.
  }, [draft]);

  const verdict = inlineBubbleSendVerdict({
    draft,
    isSessionUsable,
    hasPayload: hasComposerPayload,
  });
  const submit = (): void => {
    if (verdict === 'send') onSubmit(draft.trim());
  };

  return (
    <div
      ref={rootRef}
      className="inline-element-bubble"
      data-testid="inline-element-bubble"
      data-multiline={isMultiline ? 'true' : undefined}
      style={surface === 'layer' ? { width } : undefined}
    >
      <ChatComposer
        // Narrows `styles.css`'s app-wide square-radius rule; without it the bubble ships square.
        className="inline-element-bubble-composer"
        data-perf-surface="inline_chat"
        density="compact"
        value={draft}
        onChange={onDraftChange}
        onSubmit={submit}
        isDisabled={!isSessionUsable}
        // Empty: the library's placeholder takes only a string, and the bubble draws its own to shimmer.
        placeholder=""
        status={status}
        drawer={drawer}
        data-testid="inline-element-bubble-composer"
        input={
          <div className="inline-element-bubble-input" onWheel={onInputWheel}>
          <ChatComposerInput
            label={strings.placeholder}
            handleRef={inputRef}
            maxRows={INPUT_MAX_ROWS}
            // Both default on: up-arrow would recall a past prompt, and a long paste would become a badge chip.
            hasHistory={false}
            pasteAsToken={false}
            onFiles={onFiles}
            onKeyDown={(event) => {
              const key = resolveInlineBubbleKey({
                key: event.key,
                shiftKey: event.shiftKey,
                isComposing: event.nativeEvent.isComposing,
                keyCode: event.nativeEvent.keyCode,
                draft,
                isSessionUsable,
                hasPayload: hasComposerPayload,
              });
              if (key === 'ignore') return;
              // The library's own Enter would submit and clear the draft behind the gate.
              event.preventDefault();
              if (key === 'dismiss') {
                onDismiss();
                return;
              }
              submit();
            }}
          />
          {draft.length === 0 ? (
            <div className="inline-element-bubble-placeholder" aria-hidden="true">
              <ShimmerText
                isActive={!isCollapsed}
                weight="normal"
                base="var(--color-text-disabled)"
                crest="var(--color-text-secondary)"
                hasGlow={false}
                periodCh={INLINE_PLACEHOLDER_PERIOD_CH}
                sweepMs={INLINE_PLACEHOLDER_SWEEP_MS}
                crestCh={INLINE_PLACEHOLDER_CREST_CH}
              >
                {strings.placeholder}
              </ShimmerText>
            </div>
          ) : null}
          </div>
        }
        sendButton={
          <ChatSendButton
            data-testid="inline-element-bubble-send"
            size="sm"
            sendIcon={sendIcon}
            isDisabled={verdict !== 'send'}
            // No focus on press: a send the session turns away leaves the bubble up, and focus off the editable sends the next paste to the canvas (ONL-2549).
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onSend={submit}
            style={verdict === 'send' ? SEND_BUTTON_CIRCLE : SEND_BUTTON_QUIET}
          />
        }
      />
    </div>
  );
}
