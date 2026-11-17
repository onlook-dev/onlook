import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { GithubRepository } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { RepositoryAvatar } from './RepositoryAvatar.js';
import './github-import.css';

type RepositoryState = 'normal' | 'local' | 'archived' | 'sso' | 'approval';

export function repositoryState(repository: GithubRepository): RepositoryState {
  if (repository.access !== undefined) return repository.access;
  if (repository.onThisComputer === true) return 'local';
  return repository.archived ? 'archived' : 'normal';
}

/** Organization policy is the only true block: an archived repository still clones, it just can't take pushes. */
export function repositoryBlocked(repository: GithubRepository): boolean {
  return blocks(repositoryState(repository));
}

const blocks = (state: RepositoryState): boolean => state === 'sso' || state === 'approval';

/** The repository's name; a blocked one is dimmed, and every other lifts to white when the row does. */
export function rowInk(state: RepositoryState, { selected, lifted }: { selected: boolean; lifted: boolean }): string {
  if (blocks(state)) return selected ? '#9a9a9a' : '#7a7a7a';
  return selected || lifted ? '#fff' : '#e6e6e6';
}

/** The label at the row's right edge rests a step behind the name, and joins it only when the row lifts. */
export function metaInk(state: RepositoryState, { selected, lifted }: { selected: boolean; lifted: boolean }): string {
  if (blocks(state)) return selected ? '#9a9a9a' : '#8a8a8a';
  return selected || lifted ? '#fff' : '#8a8a8a';
}

const LABELS = { normal: undefined, local: 'github.onComputer', archived: 'github.archived', sso: 'github.blocked.sso', approval: 'github.blocked.approval' } as const satisfies Record<RepositoryState, StringKey | undefined>;
const EXPLANATIONS = {
  archived: { body: 'github.archived.body', action: 'github.openOnGithub' },
  sso: { body: 'github.blocked.sso.body', action: 'github.blocked.sso.action' },
  approval: { body: 'github.blocked.approval.body', action: 'github.blocked.approval.action' },
} as const satisfies Partial<Record<RepositoryState, { body: StringKey; action: StringKey }>>;

/** The short repository name is white inside the sentence, so the key keeps one placeholder and the view splits on it. */
function sentence(body: StringKey, repositoryName: string): React.ReactNode {
  const [before, after] = t(body, { repository: '\u0000' }).split('\u0000');
  return <>{before}<span style={{ color: '#fff' }}>{repositoryName}</span>{after}</>;
}

function explanationUrl(state: 'archived' | 'sso' | 'approval', fullName: string): string {
  const [owner = '', name = ''] = fullName.split('/');
  if (state === 'sso') return `https://github.com/orgs/${encodeURIComponent(owner)}/sso`;
  if (state === 'approval') return 'https://github.com/settings/connections/applications';
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

const optionId = (repositoryId: number): string => `github-repo-option-${String(repositoryId)}`;

const RepositoryRow = memo(function RepositoryRow({ repository, selected, active, locked, onSelect }: {
  repository: GithubRepository;
  selected: boolean;
  active: boolean;
  locked: boolean;
  onSelect(repositoryId: number): void;
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const state = repositoryState(repository);
  const blocked = blocks(state);
  const reason = state === 'archived' || state === 'sso' || state === 'approval'
    ? { ...EXPLANATIONS[state], url: explanationUrl(state, repository.fullName) } : undefined;
  const explanation = selected && reason !== undefined;
  const repositoryName = repository.fullName.split('/').at(-1) ?? repository.fullName;
  const label = LABELS[state];
  /* The keyboard's own row wears the prototype's hover look: it draws no third row state. */
  const lifted = (hovered || active) && !locked;
  const ink = rowInk(state, { selected, lifted });
  const select = (): void => { if (!locked && !selected) onSelect(repository.id); };
  return <div data-testid={`github-repo-block-${String(repository.id)}`} style={{ flexShrink: 0 }}>
    {/* The row is the listbox's option: it carries `aria-selected` whether or not it is the chosen one,
        which `Item` writes only for the chosen one, and it stays out of the Tab order because the list
        holds the one stop. Its layout is the handoff's row, drawn here rather than overridden (ONL-3182). */}
    <button type="button" role="option" id={optionId(repository.id)} aria-selected={selected} aria-disabled={locked || undefined} tabIndex={-1}
      onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
      onPointerDown={(event) => { if (event.button === 0 && event.isPrimary !== false) select(); }} onClick={select}
      data-state={state} data-testid={`github-repo-${String(repository.id)}`}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 38, padding: '0 12px', border: 0, margin: 0,
        borderRadius: explanation ? '4px 4px 0 0' : 4, textAlign: 'left', appearance: 'none', font: 'inherit', fontSize: 15,
        background: selected ? blocked ? '#262626' : '#3a3a3a' : lifted && !blocked ? '#1f1f1f' : 'transparent', color: ink,
        transition: 'none', cursor: blocked ? 'not-allowed' : 'default' }}>
      <RepositoryAvatar fullName={repository.fullName} dimmed={blocked} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repository.fullName}</span>
      {label !== undefined && <span data-testid="github-repo-label" style={{ fontSize: 14, whiteSpace: 'nowrap', color: metaInk(state, { selected, lifted }) }}>{t(label)}</span>}
    </button>
    {explanation && reason !== undefined && <div data-testid="github-repo-explanation" style={{ display: 'flex', alignItems: 'center', gap: 16,
      padding: '2px 12px 12px 44px', marginBottom: 4, background: blocked ? '#262626' : '#3a3a3a', borderRadius: '0 0 4px 4px', color: '#c8c8c8', fontSize: 14, lineHeight: 1.4 }}>
      <span style={{ flex: 1 }}>{sentence(reason.body, repositoryName)}</span>
      <Button label={t(reason.action)} variant="secondary" style={{ height: 36, paddingInline: 14, fontSize: 15, flexShrink: 0, cursor: 'default' }}
        onClick={() => window.open(reason.url, '_blank', 'noopener,noreferrer')} />
    </div>}
  </div>;
});

export function matchRepositories(repositories: GithubRepository[], query: string): GithubRepository[] {
  const needle = query.trim().toLowerCase();
  return needle === '' ? repositories : repositories.filter((repository) => repository.fullName.toLowerCase().includes(needle));
}

/** The rows line up with the fixed search field above them: a classic scrollbar takes its width out of the list, so the list gives that much of its own padding back (ONL-3182). */
export function listPadding(gutter: number): string {
  return `8px ${String(Math.max(0, 20 - gutter))}px 8px 20px`;
}

/** Where an arrow, Home or End press lands, given where it started and how many rows there are. */
export function nextRow(key: string, from: number, count: number): number | undefined {
  if (count === 0) return undefined;
  if (key === 'ArrowDown') return Math.min(from + 1, count - 1);
  if (key === 'ArrowUp') return Math.max(from - 1, 0);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return undefined;
}

export function RepositoryPicker({ repositories, repositoryId, locked, query, onQuery, onSelect, empty, actions }: {
  repositories: GithubRepository[];
  repositoryId: number | undefined;
  locked: boolean;
  query: string;
  onQuery(query: string): void;
  onSelect(repositoryId: number): void;
  empty: React.ReactNode;
  actions?: React.ReactNode;
}): React.JSX.Element {
  const scroller = useRef<HTMLDivElement>(null);
  const listbox = useRef<HTMLDivElement>(null);
  const [gutter, setGutter] = useState(0);
  const [cursor, setCursor] = useState(0);
  /* Hover and the keyboard's row are React state, not CSS: the row's whole palette is computed
     in one place from the handoff's values, and a selector cannot read the state that decides it. */
  const [reading, setReading] = useState(false);
  /* The list itself, never a row inside it, whose press focuses its own button and would light the keyboard's row under a pointer elsewhere. */
  const readingIs = (on: boolean) => (event: React.FocusEvent): void => { if (event.target === event.currentTarget) setReading(on); };
  /* `scrollbar-gutter: stable` holds this width whether or not the list overflows, so one measurement stands. */
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element !== null) setGutter(element.offsetWidth - element.clientWidth);
  }, []);
  const reveal = (id: number): void => {
    scroller.current?.querySelector<HTMLElement>(`[data-testid="github-repo-block-${String(id)}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  useLayoutEffect(() => {
    if (repositoryId !== undefined) reveal(repositoryId);
  }, [repositoryId]);
  const at = repositories.length === 0 ? undefined : Math.min(cursor, repositories.length - 1);
  const active = at === undefined ? undefined : repositories[at];
  const move = (next: number): void => {
    setCursor(next);
    const row = repositories[next];
    if (row !== undefined) reveal(row.id);
  };
  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (locked || at === undefined) return;
    const next = nextRow(event.key, at, repositories.length);
    if (next !== undefined) {
      event.preventDefault();
      move(next);
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (active !== undefined) onSelect(active.id);
  };
  return <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}>
    <div style={{ padding: '12px 20px 4px', flexShrink: 0 }}>
      <input aria-label={t('github.search')} placeholder={t('github.search')} value={query} maxLength={200} autoFocus data-autofocus
        onChange={(event) => onQuery(event.target.value)} data-testid="github-search"
        onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); listbox.current?.focus(); } }}
        style={{ width: '100%', height: 36, boxSizing: 'border-box', padding: '0 12px', background: '#141414', border: '0.5px solid #3a3a3a',
          borderRadius: 6, color: '#f2f2f2', font: 'inherit', fontSize: 15, userSelect: 'text', WebkitUserSelect: 'text', cursor: 'text' }} />
    </div>
    <div ref={scroller} data-testid="github-list" className="github-repository-list"
      style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: listPadding(gutter), scrollbarGutter: 'stable' }}>
      {/* One Tab stop for every row, so the controls after the list are one more Tab away. The ground, radius and shadow
          take back `.astryx-dialog [role='listbox']`, a Selector popup's panel, so the rows sit on the modal's black (ONL-3182). */}
      <div ref={listbox} role="listbox" tabIndex={0} aria-label={t('github.repositories')} data-testid="github-repositories"
        {...(active === undefined ? {} : { 'aria-activedescendant': optionId(active.id) })}
        onKeyDown={onKeyDown} onFocus={readingIs(true)} onBlur={readingIs(false)}
        style={{ background: 'transparent', borderRadius: 0, boxShadow: 'none' }}>
        {repositories.map((repository) => <RepositoryRow key={repository.id} repository={repository} selected={repository.id === repositoryId}
          active={reading && repository.id === active?.id} locked={locked} onSelect={onSelect} />)}
      </div>
      {repositories.length === 0 && <div data-testid="github-empty" style={{ padding: '24px 12px', color: '#8a8a8a', fontSize: 14 }}>{empty}</div>}
      {actions}
    </div>
  </div>;
}
