export enum MessageSnapshotType {
    GIT = 'git',
}

interface BaseMessageSnapshot {
    type: MessageSnapshotType;
    createdAt: Date;
}

export interface GitMessageSnapshot extends BaseMessageSnapshot {
    type: MessageSnapshotType.GIT;
    oid: string;
}

export type MessageSnapshot = GitMessageSnapshot;
