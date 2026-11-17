import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '../overlay/Dialog.js';
import { Icon } from '@astryxdesign/core/Icon';
import { Item } from '@astryxdesign/core/Item';
import { VStack } from '@astryxdesign/core/Layout';
import { usePopover } from '@astryxdesign/core/Popover';
import type { GithubEntryPoint } from '@studio/events';
import { AgentCard } from '../agents/AgentCard.js';
import { capable } from '../capabilities.js';
import { useFlag } from '../flags/store.js';
import { CAP_GLYPH_ON_LABEL } from '../icons/capGlyph.js';
import { FolderAddIcon, FolderIcon, GithubIcon } from '../icons/glyphs.js';
import { t } from '@studio/i18n';
import { MENU_PANEL } from '../menu/surface.js';
import { SIDEBAR_ROW_HEIGHT } from '../projects/SidebarRow.js';
import { FLOW_BOX, GITHUB_FLOW_HEIGHT, GITHUB_FLOW_WIDTH, GithubImportFlow } from './GithubImport.js';
import { cloningNow, dismissGithub, prepareGithub, useGithubImport } from './store.js';

export interface AddCodebaseProps {
  entryPoint: GithubEntryPoint;
  onFolder(): void;
  /** A host that cannot open a cloned Workspace gets no GitHub choice: the clone would finish into nothing. */
  onOpen?(path: string, existing: boolean): void;
  isPrimary?: boolean;
  isFullWidth?: boolean;
  /** In the left column the button is one of the rows, and stands exactly as tall as they do (ONL-3182). */
  isRowSized?: boolean;
  /** Onboarding stands the door beside Start from scratch, so there it is a card of that card's size (ONL-3182). */
  presentation?: 'button' | 'card';
  /** Another flow already has the screen: the door is there, out of reach, and opens nothing (ONL-3182). */
  isBusy?: boolean;
}

/* A floor, not a height: a longer translation of the label wraps and takes the room it needs,
   exactly as the rows beside it do. */
const ROW_SIZED: React.CSSProperties = {
  height: 'auto', minHeight: SIDEBAR_ROW_HEIGHT, paddingBlock: 0,
  paddingInline: 'var(--spacing-2)', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-base)',
};

/* The card fills the column it is given, so the choice beside it is the same size. */
const CARD_BOX: React.CSSProperties = { display: 'flex', flex: '1 0 0', minWidth: 0 };

/** The one door into a codebase: a folder, or a GitHub repository in its own modal. */
export function AddCodebase({ entryPoint, onFolder, onOpen, isPrimary = true, isFullWidth = true, isRowSized = false, presentation = 'button', isBusy = false }: AddCodebaseProps): React.JSX.Element {
  const githubEnabled = useFlag('githubImport') && capable('github') && onOpen !== undefined;
  /* Cancel clone is the way out while one runs, so Escape and the backdrop stop closing the modal (ONL-3182). */
  const isCloning = useGithubImport(cloningNow);
  const [githubPhase, setGithubPhase] = useState<'closed' | 'preparing' | 'open'>('closed');
  const isGithubOpen = githubPhase !== 'closed';
  const focusRequest = useRef(0);
  const trigger = useRef<HTMLElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);
  /* A card's press target is the button `ClickableCard` hides inside it; a button is its own. */
  const pressed = (): HTMLElement | null => {
    const node = trigger.current;
    return node === null ? null : node.querySelector('button') ?? node;
  };
  const popover = usePopover({
    role: 'dialog', dialogLabel: t('codebase.add'), isModal: false, hasCloseButton: false, hasAutoFocus: true, hasLightDismiss: true, hasEscapeDismiss: true, hasSurface: false,
    onHide: () => { pressed()?.focus(); },
  });
  useLayoutEffect(() => {
    if (githubPhase === 'open') content.current?.querySelector<HTMLInputElement | HTMLButtonElement>('input:not(:disabled), button:not(:disabled)')?.focus();
  }, [githubPhase]);
  /* The card's own press target carries the popup's state, where a screen reader reads it; `ClickableCard` takes no props for it. */
  useLayoutEffect(() => {
    if (presentation !== 'card') return;
    const button = trigger.current?.querySelector('button');
    if (!button) return;
    const popup = { 'aria-haspopup': 'dialog', 'aria-expanded': String(popover.isOpen), 'aria-controls': popover.id };
    for (const [name, value] of Object.entries(popup)) {
      if (isBusy) button.removeAttribute(name); else button.setAttribute(name, value);
    }
  }, [presentation, isBusy, popover.isOpen, popover.id]);
  /* Explicit, because the element the modal returns focus to is whatever held it when the popover closed. */
  const closeGithub = (): void => {
    focusRequest.current += 1;
    setGithubPhase('closed');
    pressed()?.focus();
  };
  const chooseGithub = (): void => {
    const request = ++focusRequest.current;
    popover.hide();
    pressed()?.focus();
    setGithubPhase('preparing');
    void prepareGithub(entryPoint).then(() => { if (focusRequest.current === request) setGithubPhase('open'); });
  };
  const chooseFolder = (): void => { popover.hide(); onFolder(); };
  const hold = (node: HTMLElement | null): void => { trigger.current = node; popover.triggerRef(node); };
  return <>
    {presentation === 'card'
      ? <div ref={hold} style={CARD_BOX}>
          <AgentCard state="default" icon={FolderAddIcon} label={t('codebase.add')} testId="add-codebase"
            {...(isBusy ? { isDisabled: true } : { onSelect: popover.toggle })} />
        </div>
      : <Button ref={hold}
        label={t('codebase.add')} icon={<Icon icon={FolderAddIcon} color="inherit" style={CAP_GLYPH_ON_LABEL} />} variant={isPrimary ? 'primary' : 'ghost'} size="md"
        {...popover.triggerProps} onClick={popover.toggle} data-testid="add-codebase"
        style={{ ...(isFullWidth ? { width: '100%', justifyContent: 'flex-start' } : {}), ...(isRowSized ? ROW_SIZED : {}) }} />}
    {popover.render(<VStack gap={0} className="menu-surface" aria-label={t('codebase.add')} data-testid="add-codebase-popover"
      style={{ ...MENU_PANEL, width: 260, maxWidth: 'calc(100vw - 32px)', marginBlockStart: 'var(--spacing-2)' }}>
      <Item className="composer-menu-item" label={t('codebase.folder')} startContent={<Icon icon={FolderIcon} size="sm" color="inherit" />} onClick={chooseFolder} data-testid="codebase-from-folder" />
      {githubEnabled && <Item className="composer-menu-item" label={t('codebase.github')} startContent={<Icon icon={GithubIcon} size="sm" color="inherit" />}
        onClick={chooseGithub} data-testid="codebase-from-github" />}
    </VStack>, { placement: 'below', alignment: 'center' })}
    <Dialog isOpen={isGithubOpen && githubEnabled} purpose={isCloning ? 'required' : 'form'} padding={0} width={GITHUB_FLOW_WIDTH} maxHeight={GITHUB_FLOW_HEIGHT}
      style={{ height: GITHUB_FLOW_HEIGHT }} aria-label={t('github.import')} data-testid="add-codebase-dialog"
      onOpenChange={(value) => { if (!value) { dismissGithub(); closeGithub(); } }}>
      {isGithubOpen && <div ref={content} style={FLOW_BOX}>
        <GithubImportFlow entryPoint={entryPoint}
          onClose={closeGithub}
          onFolder={() => { closeGithub(); onFolder(); }}
          onOpen={(path, existing) => { closeGithub(); onOpen?.(path, existing); }} />
      </div>}
    </Dialog>
  </>;
}
