import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { RegionErrorBoundary } from '../RegionErrorBoundary.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { useProjectName } from '../projects/useProjectName.js';
import { fileName } from './breadcrumb.js';
import { ImagePreview } from './ImagePreview.js';
import { CodePanel } from './CodePanel.js';
import { CodeLoading } from './CodeLoading.js';

import { ClashBanner, MissingFileNotice } from './ClashBanner.js';
import { clashVerdict, showsBanner } from './clashVerdict.js';
import { FilesView } from './files/FilesView.js';
import { relatedImports, relativeSpecifiers } from './files/imports.js';
import type { FileScope } from './files/fileScope.js';
import { SAVE_BAR_EXIT_MS, SAVED_HOLD_MS, SaveBar, type SaveBarPhase } from './SaveBar.js';
import { panelRefusal } from './panelBody.js';
import { saveBarPhase } from './savePhase.js';
import { noteCodeOpened, useFollowHeldMapping, useSelectionMapping } from './selectionMapping.js';
import { anyDirty, isDirty, pendingTab, useCodeStore } from './store.js';
import type { CodeTabFacts } from './TabRow.js';
import { SelectionLabel } from './SelectionLabel.js';
import { tintLabel } from './tintLabel.js';
import { studio } from '../bridge.js';

const CodeArea = lazy(async () => {
  const module = await import('./CodeArea.js');
  return { default: module.CodeArea };
});

/** ⚠️ ONE effect: a save clears `dirty` and bumps `savedToken` together, and judged apart the second arm took the bar down in the same commit (ONL-2563). */
function useSaveBarPhase(dirty: boolean, savedToken: number): SaveBarPhase | null {
  const [phase, setPhase] = useState<SaveBarPhase | null>(null);
  const seen = useRef(savedToken);

  useEffect(() => {
    const isNewSave = savedToken !== seen.current;
    seen.current = savedToken;
    setPhase((current) => saveBarPhase({ phase: current, dirty, isNewSave }));
    if (!isNewSave || dirty) return;
    const hold = window.setTimeout(() => setPhase('leaving'), SAVED_HOLD_MS);
    const gone = window.setTimeout(() => setPhase(null), SAVED_HOLD_MS + SAVE_BAR_EXIT_MS);
    // Cleared on the next change too: an edit typed inside the hold must not be timed out by it.
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(gone);
    };
  }, [dirty, savedToken]);

  return phase;
}

/** The code view as the app mounts it. The error boundary's retry re-mounts this subtree, which the buffer survives because it lives in the store, not the editor. */
export function CodePanelSurface(): React.JSX.Element {
  const projectName = useProjectName();
  const repositoryName = useWorkspaceStore((state) => state.workspace?.sourceRepoName);
  const tabs = useCodeStore((state) => state.tabs);
  const activePath = useCodeStore((state) => state.activePath);
  const activate = useCodeStore((state) => state.activate);
  const close = useCodeStore((state) => state.close);

  const edit = useCodeStore((state) => state.edit);
  const saveChanges = useCodeStore((state) => state.saveChanges);
  const discardChanges = useCodeStore((state) => state.discardChanges);
  const keepMine = useCodeStore((state) => state.keepMine);
  const reloadFile = useCodeStore((state) => state.reload);
  const dirty = anyDirty(tabs);
  const savedToken = useCodeStore((state) => state.savedToken);
  const phase = useSaveBarPhase(dirty, savedToken);

  useEffect(() => {
    studio().codeDirty({ isDirty: dirty });
  }, [dirty]);

  useEffect(
    () =>
      studio().onCodeWritten((report) => {
        void useCodeStore.getState().noteAgentWrote(report.paths);
      }),
    [],
  );

  useEffect(
    () =>
      studio().onCodeSave(() => {
        void useCodeStore.getState().saveChanges();
      }),
    [],
  );

  const facts: readonly CodeTabFacts[] = tabs.map((tab) => ({
    path: tab.path,
    name: fileName(tab.path),
    isDirty: isDirty(tab),
    hasClash: showsBanner(
      clashVerdict({
        isDirty: isDirty(tab),
        held: tab.snapshot,
        onDisk: tab.onDisk,
        wasRefusedStale: tab.writeRefusal === 'stale',
      }),
    ),
  }));
  const active = tabs.find((tab) => tab.path === activePath);
  const selected = useSelectionMapping(activePath);
  const label = tintLabel({ mapping: selected.mapping, isStale: selected.isStale });

  const files = useCodeStore((state) => state.files);
  const listFiles = useCodeStore((state) => state.listFiles);
  const query = useCodeStore((state) => state.query);
  const names = useCodeStore((state) => state.names);
  const contents = useCodeStore((state) => state.contents);
  const isSearching = useCodeStore((state) => state.isSearching);
  const search = useCodeStore((state) => state.search);
  const open = useCodeStore((state) => state.open);
  const takeFocus = useCodeStore((state) => state.takeFocus);
  const focus = useCodeStore((state) => state.focus);
  const [scope, setScope] = useState<FileScope>('design');
  const [browse, setBrowse] = useState(false);
  const isBrowsing = active === undefined || browse;

  // Read once the view is on screen, not at mount: the panel is behind a rail press.
  useEffect(() => {
    void listFiles();
  }, [listFiles]);

  useFollowHeldMapping();

  const recheck = useCodeStore((state) => state.recheck);
  const shownPath = isBrowsing ? null : (active?.path ?? null);
  useEffect(() => {
    if (shownPath === null) return;
    void recheck(shownPath);
  }, [shownPath, recheck]);
  useEffect(() => {
    const onFocus = (): void => {
      const path = useCodeStore.getState().activePath;
      if (path !== null) void useCodeStore.getState().recheck(path);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const mappedPath = selected.mapping?.path ?? null;
  const definitionPath = selected.mapping?.definition?.path ?? null;
  const specifiers = useCodeStore((state) => state.specifiers);
  const readSpecifiers = useCodeStore((state) => state.readSpecifiers);
  useEffect(() => {
    const seeds = [mappedPath, definitionPath].filter((path): path is string => path !== null);
    if (seeds.length > 0) void readSpecifiers(seeds);
  }, [mappedPath, definitionPath, readSpecifiers, tabs, specifiers]);
  const related = useMemo(
    () =>
      relatedImports(
        [mappedPath, definitionPath]
          .filter((path): path is string => path !== null)
          .map((path) => {
            const open = tabs.find((tab) => tab.path === path);
            return {
              path,
              specifiers: open === undefined ? (specifiers[path] ?? []) : relativeSpecifiers(open.text),
            };
          }),
        files,
      ),
    [mappedPath, definitionPath, tabs, specifiers, files],
  );

  const browser = (
    <FilesView
      files={files}
      scope={scope}
      onScope={setScope}
      query={query}
      onQuery={(next) => void search(next)}
      names={names}
      contents={contents}
      isSearching={isSearching}
      openPath={activePath}
      mappedFile={selected.mapping?.path ?? null}
      componentFile={selected.mapping?.definition?.path ?? null}
      relatedFiles={related}
      {...(active === undefined ? {} : { onClose: () => setBrowse(false) })}
      onOpen={(path, line) => {
        noteCodeOpened(query.trim() === '' ? 'files-view' : 'search', 'file', 'declined');
        // The browser steps aside once it has done its job, which is what makes it a door.
        setBrowse(false);
        void open(path, line);
      }}
    />
  );

  // Only once the read has answered: an editor seeded with the empty string and
  // then re-seeded would put an empty document in the undo history.
  function renderBody(): React.ReactNode {
    if (isBrowsing) return browser;
    if (active === undefined || active.refusal !== null) return undefined;
    if (active.snapshot === null) return <CodeLoading />;
    if (active.image !== undefined) {
      return <ImagePreview key={`${active.path}:${active.snapshot.hash}`} path={active.path} dataUrl={active.image.dataUrl} bytes={active.snapshot.size} />;
    }
    return (
      <Suspense fallback={<CodeLoading />}>
        <CodeArea
          path={active.path}
          text={active.text}
          animateChanges={active.agentText === active.text}
          eol={active.snapshot.eol}
          tint={selected.tint}
          focusLine={focus?.path === active.path ? focus.line : null}
          focusEditor={focus?.path === active.path && focus.focusEditor}
          onFocusApplied={() => takeFocus(active.path)}
          onChange={(text) => {
            edit(active.path, text);
          }}
        />
      </Suspense>
    );
  }
  const body = renderBody();

  const verdict =
    active === undefined
      ? 'clean'
      : clashVerdict({
          isDirty: isDirty(active),
          held: active.snapshot,
          onDisk: active.onDisk,
          wasRefusedStale: active.writeRefusal === 'stale',
        });
  const pending = pendingTab(tabs, activePath);

  return (
    <RegionErrorBoundary region="code">
      <CodePanel
        projectName={projectName ?? ''}
        repositoryName={repositoryName ?? ''}
        tabs={facts}
        activePath={activePath}
        refusal={panelRefusal(active?.refusal ?? null, isBrowsing)}
        onActivate={activate}
        onClose={close}
        isBrowsing={isBrowsing}
        onBrowse={() => {
          setBrowse((current) => !current);
          void search('');
        }}
        {...(body === undefined ? {} : { body })}
        {...(!selected.hasSelection || selected.isAsking
          ? {}
          : {
              tintLabel: (
                <SelectionLabel
                  label={label}
                  others={selected.mapping?.others ?? []}
                  sourceElsewhere={selected.mapping}
                  onOpen={(candidate, source) => {
                    noteCodeOpened('candidate', 'element', source === 'selection' ? (selected.mapping?.grade ?? 'declined') : 'best-guess');
                    // Its line too: a candidate that opens at the top of the file has not answered.
                    void open(candidate.path, candidate.line);
                  }}
                />
              ),
            })}
        {...(active === undefined || verdict !== 'missing'
          ? {}
          : { banner: <MissingFileNotice name={fileName(active.path)} /> })}
        {...(active === undefined || !showsBanner(verdict)
          ? {}
          : {
              banner: (
                <ClashBanner
                  name={fileName(active.path)}
                  source={active.clashSource}
                  onKeepMine={() => {
                    keepMine(active.path);
                  }}
                  onReload={() => {
                    reloadFile(active.path);
                  }}
                />
              ),
            })}
        {...(phase === null || active === undefined
          ? {}
          : {
              saveBar: (
                <SaveBar
                  phase={phase}
                  refusal={pending?.writeRefusal ?? null}
                  onSave={() => void saveChanges()}
                  onDiscard={discardChanges}
                />
              ),
            })}
      />
    </RegionErrorBoundary>
  );
}
