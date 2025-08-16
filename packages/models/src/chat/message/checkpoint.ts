export enum MessageCheckpointType {
    GIT = 'git',
}

interface BaseMessageCheckpoint {
    type: MessageCheckpointType;
    createdAt: Date;
}

export interface GitMessageCheckpoint extends BaseMessageCheckpoint {
    type: MessageCheckpointType.GIT;
    oid: string;
}

export type MessageCheckpoints = GitMessageCheckpoint;
