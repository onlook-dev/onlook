import type { CodeDiff } from 'src/code';

export enum MessageSnapshotType {
    GIT_COMMIT = 'git-commit',
    CODE_DIFF = 'code-diff',
}

interface BaserMessageSnapshot {
    type: MessageSnapshotType;
    createdAt: Date;
}

export interface GitMessageSnapshot extends BaserMessageSnapshot {
    type: MessageSnapshotType.GIT_COMMIT;
    oid: string;
}

export interface CodeMessageSnapshot extends BaserMessageSnapshot {
    type: MessageSnapshotType.CODE_DIFF;
    diff: CodeDiff;
}

export type MessageSnapshot = GitMessageSnapshot | CodeMessageSnapshot;
