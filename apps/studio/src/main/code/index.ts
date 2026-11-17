import { handle, on } from '../ipc/bridge.js';
import {
  IPC_EMIT,
  IPC_INVOKE,
  IPC_SEND,
  type CodeDirtyReport,
  type CodeListResult,
  type CodeReadResult,
  type CodeSearchResult,
  type CodeIdentifyRequest,
  type CodeIdentifyResult,
  type CodeComponentMapResult,
  type CodeMapResult,
  type CodeWriteResult,
} from '@studio/events';
import { noteCodeDirty } from './dirty.js';
import { setWrittenPathsSink } from '../agent-host/written-paths.js';
import { views } from '../tabs/views.js';
import { listCodeFiles } from './list.js';
import { readCodeFile } from './read.js';
import { searchCode } from './search.js';
import { writeCodeFile } from './write.js';
import { frameMirror } from '../canvas/mirror.js';
import { identifyComponent, readComponentMap } from './mapper/identify.js';
import { mapSelection } from './mapper/pipeline.js';
import { fetchTextFromFrame } from './mapper/sources.js';

function identify(req: CodeIdentifyRequest): Promise<CodeIdentifyResult> {
  return identifyComponent(
    { frameId: req.frameId, webContentsId: frameMirror().peek(req.docId, req.frameId)?.webContentsId },
    req,
  );
}

const unaddressable = { ok: false, decline: 'unaddressable' } as const;
const noProject = { ok: false, code: 'no-project' } as const;

/** The door resolves the Project and refuses a foreign Canvas document; each channel contains its own target inside it (ONL-2563). */
export function registerCodeHandlers(): void {
  setWrittenPathsSink((cwd, paths) => {
    views.routeTo(cwd, IPC_EMIT.codeWritten, { paths });
  });

  handle(IPC_INVOKE.codeRead, (project, req): CodeReadResult => readCodeFile(project.root, req), () => noProject);
  handle(IPC_INVOKE.codeList, (project, req): CodeListResult => listCodeFiles(project.root, req), () => noProject);
  handle(IPC_INVOKE.codeSearch, (project, req): CodeSearchResult => searchCode(project.root, req), () => noProject);
  on(IPC_SEND.codeDirty, (event, report: CodeDirtyReport) => {
    noteCodeDirty(event.sender.id, report.isDirty);
  });
  handle(IPC_INVOKE.codeWrite, (project, req): CodeWriteResult => writeCodeFile(project.root, req), () => noProject);
  handle(IPC_INVOKE.codeIdentify, (_project, req): Promise<CodeIdentifyResult> => identify(req), () => unaddressable);
  handle(
    IPC_INVOKE.codeComponentMap,
    (_project, req): Promise<CodeComponentMapResult> => readComponentMap(
      { frameId: req.frameId, webContentsId: frameMirror().peek(req.docId, req.frameId)?.webContentsId },
      req.loadToken,
    ),
    () => unaddressable,
  );
  handle(
    IPC_INVOKE.codeMap,
    (project, req): Promise<CodeMapResult> => mapSelection(
      {
        worktree: project.root,
        identify,
        fetchText: fetchTextFromFrame,
        search: (query) => searchCode(project.root, { query }),
      },
      req,
    ),
    () => unaddressable,
  );
}
