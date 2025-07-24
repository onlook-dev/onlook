enum MessageSnapshotType {
    GIT = 'git',
}

interface BaserMessageSnapshot {
    type: MessageSnapshotType;
    createdAt: Date;
    updatedAt: Date;
}

export interface GitMessageSnapshot extends BaserMessageSnapshot {
    type: MessageSnapshotType.GIT;
    oid: string;
}

export type MessageSnapshot = GitMessageSnapshot;
