import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { observeResize, unobserveResize } from '@astryxdesign/core/utils';
import { Item } from '@astryxdesign/core/Item';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Icon } from '@astryxdesign/core/Icon';
import { CheckIcon, ForwardIcon, OpenExternalIcon } from '../../icons/glyphs.js';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { useListFocus } from '@astryxdesign/core/hooks';
import { ShimmerText } from '@studio/chat-ui';
import { connectorRowAction, type AgentConnector, type ConnectorInventory, type ConnectorState, type FeaturedConnector, type HarnessId } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { MENU_PANEL } from '../../menu/surface.js';
import { MenuHeading } from '../../menu/composerMenuRow.js';
import { ConnectorMark } from './marks.js';
import { connectorRows } from './model.js';
import { useExpandMotion } from './useExpandMotion.js';
import './connectors.css';

const STATE_KEYS: Record<ConnectorState, StringKey> = {
  connected: 'chat.connectors.state.connected', starting: 'chat.connectors.state.starting', 'needs-sign-in': 'chat.connectors.state.needsSignIn', failed: 'chat.connectors.state.failed', off: 'chat.connectors.state.off',
  adding: 'chat.connectors.state.adding', 'awaiting-sign-in': 'chat.connectors.state.awaitingSignIn', 'sign-in-failed': 'chat.connectors.state.failed',
};

const AGENT_KEYS: Record<HarnessId, StringKey> = { claude: 'agent.name.claude', codex: 'agent.name.codex' };

/** Every right-hand label and action in this menu reads at one size, so a new one cannot ship microscopic (ONL-3181). */
const DETAIL_TEXT: React.CSSProperties = { fontSize: 'var(--text-supporting-size)', lineHeight: 'var(--text-supporting-leading)' };

/** `.composer-menu-item` maps primary ink to secondary, so names set on-dark outright (ONL-3193). */
const NAME: React.CSSProperties = { display: 'block', color: 'var(--color-on-dark)', fontSize: 'var(--text-supporting-size)' };

const QUIET = 'var(--color-text-disabled)';
/** A long tool name fades rather than widening the menu, so it opens at one width wherever it is (ONL-3193). */
export const CONNECTORS_MENU_WIDTH = 256;
export const CONNECTORS_MENU_EXIT_MS = 165;
const GRAY = 'var(--color-text-gray)';

const FEATURED_KEYS: Record<FeaturedConnector, StringKey> = { figma: 'chat.connectors.figma', mobbin: 'chat.connectors.mobbin' };

/** The name the row shows: a featured row is labelled by the tool, not by the account's own `claude.ai Mobbin` server name (ONL-3181). */
function rowName(server: AgentConnector): string {
  return server.featured === undefined ? server.name : t(FEATURED_KEYS[server.featured]);
}

/** Words cut at their box fade out at the end instead of taking an ellipsis (ONL-3193). */
function Fading({ children, style, ...rest }: { children: React.ReactNode; style?: React.CSSProperties; 'data-testid'?: string; 'aria-hidden'?: true }): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const words = ref.current;
    if (!words) return;
    observeResize(words, () => setOverflows(words.scrollWidth > words.clientWidth + 0.5));
    return () => unobserveResize(words);
  }, [children]);
  return <span ref={ref} className="chat-connectors-fading" data-overflows={overflows ? 'true' : undefined} style={{ display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', ...style }} {...rest}>{children}</span>;
}

/** The external arrow and the gap before it, which come out of the status's share whether or not a row draws them (ONL-3181). */
const ARROW_WIDTH = 18;

function Status({ server, maxWidth }: { server: AgentConnector; maxWidth: number }): React.JSX.Element {
  const color = `var(--menu-detail-color, ${QUIET})`;
  const words = server.state === 'awaiting-sign-in'
    ? <ShimmerText isActive type="supporting" weight="normal" base={QUIET} crest={GRAY} hasGlow={false} periodCh={30}>{t(STATE_KEYS[server.state])}</ShimmerText>
    : t(STATE_KEYS[server.state]);
  const label = <span role="status" data-testid="chat-connectors-state" style={{ ...DETAIL_TEXT, color, textAlign: 'end', maxWidth: maxWidth - ARROW_WIDTH }}>{words}</span>;
  const status = server.state === 'failed' && server.error ? <Tooltip content={server.error} placement="above">{label}</Tooltip> : label;
  return <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', color, maxWidth, marginInlineStart: 'var(--spacing-2)' }}>{status}{server.managedExternally && connectorRowAction(server) ? <Icon icon={OpenExternalIcon} color="inherit" style={{ width: 14, height: 14, flexShrink: 0 }} /> : null}</span>;
}

/** The browser hand-off an account-managed connector opens says nothing inside Onlook on its own (ONL-3181). */
function Handoff({ server }: { server?: AgentConnector }): React.JSX.Element | null {
  if (server?.managedExternally !== true || server.state !== 'awaiting-sign-in') return null;
  return <div role="status" data-testid="chat-connectors-handoff" style={{ ...DETAIL_TEXT, margin: '0 var(--spacing-2) var(--spacing-1-5)', color: GRAY }}>{t('chat.connectors.handoff', { connector: rowName(server) })}</div>;
}

export function ConnectorsMenu({ agent, inventory, recentIds, onAdd, onAct, onDismiss, maxHeight, defaultExpanded = false }: { agent: HarnessId; inventory?: ConnectorInventory; recentIds?: ReadonlySet<string>; onAdd: (featured: FeaturedConnector) => void; onAct: (id: string) => void; onDismiss?: () => void; maxHeight?: number; defaultExpanded?: boolean }): React.JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  /* The list grows the menu upward, so rows slide under a pointer that never moved; they take no hover until it does. */
  const [shifted, setShifted] = useState(false);
  const { parts, capture } = useExpandMotion(expanded);
  const toggle = (): void => { capture(); setShifted(true); setExpanded(!expanded); };
  /* `useListFocus` consumes Escape whether or not it is given somewhere to send it, and the popover's own dismissal skips a consumed key (ONL-3181). */
  const { listRef, handleKeyDown } = useListFocus<HTMLDivElement>({ itemSelector: '[role="menuitem"]:not([inert] *)', onEscape: onDismiss });
  const { featured, others, known } = connectorRows(inventory);
  const loading = inventory === undefined;
  const heading = t('chat.connectors.menu.heading', { agent: t(AGENT_KEYS[agent]) });
  /* Past this share a status wraps to a second line; the name keeps the rest of the row (ONL-3181). */
  const statusMax = CONNECTORS_MENU_WIDTH / 2;
  const hintMax = Math.round(CONNECTORS_MENU_WIDTH * 0.42);
  const hint = others.length === 0 ? t('chat.connectors.menu.none') : others.slice(0, 3).map((server) => server.name).join(', ');
  const more = others.length > 3 ? t('chat.connectors.menu.otherMore', { count: others.length - 3 }) : undefined;
  return (
    <div ref={listRef} role="menu" aria-label={heading} tabIndex={-1} className="chat-connectors-menu" data-testid="chat-connectors-menu" data-shifted={shifted ? 'true' : undefined} onPointerMove={shifted ? () => setShifted(false) : undefined} style={{ ...MENU_PANEL, paddingBlockEnd: 'var(--spacing-2)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: CONNECTORS_MENU_WIDTH, maxWidth: '100%', ...(maxHeight === undefined ? {} : { maxHeight }) }} onKeyDown={(event) => {
      if ((event.key === 'Enter' || event.key === ' ') && document.activeElement?.getAttribute('role') === 'menuitem') { event.preventDefault(); (document.activeElement as HTMLElement).click(); }
      else handleKeyDown(event);
    }}>
      <div style={{ flexShrink: 0 }}>
        <MenuHeading label={heading} />
        {featured.map(({ featured: id, server }) => {
          const action = server === undefined ? undefined : connectorRowAction(server);
          const canAdd = known && server === undefined;
          const interactive = known && (canAdd || action !== undefined);
          const offersSignIn = action === 'sign-in' && server?.state === 'needs-sign-in';
          let endContent: React.ReactNode = null;
          /* A spinner here said nothing a person could read; a row under Other tools shows these words for the same state (ONL-3181). */
          if (canAdd || offersSignIn) endContent = <span style={{ ...DETAIL_TEXT, color: 'var(--color-on-dark)', whiteSpace: 'nowrap' }}>{t(canAdd ? 'chat.connectors.add' : 'chat.connectors.signIn')}</span>;
          else if (server) endContent = <Status server={server} maxWidth={statusMax} />;
          return <Fragment key={id}>
            <Item as="div" {...(interactive ? { role: 'menuitem', tabIndex: -1, onClick: () => server ? onAct(server.id) : onAdd(id), className: 'composer-menu-item' } : {})} label={<span data-testid="chat-connectors-name" style={NAME}>{t(FEATURED_KEYS[id])}</span>} startContent={<ConnectorMark which={id} />} endContent={endContent} style={{ paddingBlock: 'var(--spacing-1-5)', paddingInline: 'var(--spacing-2)' }} data-testid="chat-connectors-featured" data-featured={id} data-state={server?.state ?? (known ? 'not-added' : 'unknown')} />
            <Handoff server={server} />
          </Fragment>;
        })}
        <div style={{ margin: '10px var(--spacing-2)', height: 1, background: 'var(--color-overlay-pressed)' }} />
        {inventory?.unavailable ? <div role="status" style={{ ...DETAIL_TEXT, padding: 'var(--spacing-2)', color: GRAY }}>{t('chat.connectors.unavailable')}</div> : (
          <Item as="div" {...(others.length > 0 ? { role: 'menuitem', tabIndex: -1, onClick: toggle, className: 'composer-menu-item', 'aria-expanded': expanded } : {})} label={<span ref={parts.label} data-testid="chat-connectors-other-label" style={{ ...NAME, ...(expanded ? { color: `var(--menu-detail-color, ${GRAY})` } : {}) }}>{t('chat.connectors.menu.other')}</span>} endContent={loading ? <span aria-label={t('chat.connectors.menu.loading')} data-testid="chat-connectors-loading"><Spinner size="sm" shade="subtle" /></span> : <span style={{ ...DETAIL_TEXT, display: 'flex', alignItems: 'center', gap: 2, color: `var(--menu-detail-color, ${GRAY})` }}>
            <span ref={parts.summary} aria-hidden={expanded || undefined} style={{ display: 'flex', alignItems: 'center', gap: 2, visibility: expanded ? 'hidden' : undefined }}><Fading data-testid="chat-connectors-hint" style={{ maxWidth: hintMax }}>{hint}</Fading>{more !== undefined && <span data-testid="chat-connectors-more" style={{ whiteSpace: 'nowrap', marginInlineStart: 2 }}>{more}</span>}</span>
            {others.length > 0 && <span ref={parts.chevron} style={{ display: 'inline-flex', transform: expanded ? 'rotate(90deg)' : undefined }}><Icon icon={ForwardIcon} color="inherit" style={{ width: 14, height: 14 }} /></span>}
          </span>} data-testid="chat-connectors-other" style={{ paddingInline: 'var(--spacing-2)' }} />
        )}
      </div>
      {/* Shut, the rows stay laid out at no height, so opening the list never changes the menu's width (ONL-3193). */}
      {others.length > 0 && <div ref={parts.list} inert={!expanded} style={{ flex: '0 1 auto', minHeight: 0, ...(expanded ? { overflowY: 'auto' } : { height: 0, overflow: 'hidden', visibility: 'hidden' }) }} data-testid="chat-connectors-list" data-expanded={expanded ? 'true' : undefined}>{others.map((server) => {
        const interactive = known && connectorRowAction(server) !== undefined;
        const recent = recentIds?.has(server.id) === true;
        return <Fragment key={server.id}><Item
          as="div"
          className={interactive ? 'composer-menu-item chat-connector-row' : 'chat-connector-row'}
          {...(interactive ? { role: 'menuitem', tabIndex: -1, onClick: () => onAct(server.id) } : {})}
          label={<Fading data-testid="chat-connectors-name" style={NAME}>{server.name}</Fading>}
          endContent={<span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
            <Status server={server} maxWidth={statusMax} />
            {recent && <span role="status" aria-label={t('chat.connectors.added')} data-testid="chat-connectors-added" style={{ display: 'inline-flex', color: 'var(--color-icon-green)' }}><Icon icon={CheckIcon} size="sm" color="inherit" /></span>}
          </span>}
          data-testid="chat-connectors-row"
          data-state={server.state}
          data-recent={recent ? 'true' : undefined}
          style={{ paddingInline: 'var(--spacing-2)', paddingBlock: 'var(--spacing-1-5)' }}
        /><Handoff server={server} /></Fragment>;
      })}</div>}
    </div>
  );
}
