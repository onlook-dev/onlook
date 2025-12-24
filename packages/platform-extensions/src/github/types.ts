export interface GitHubAuth {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
}

export interface Branch {
    name: string;
    sha: string;
    url: string;
}

export interface PullRequest {
    id: string;
    number: number;
    title: string;
    description: string;
    branch: string;
    baseBranch: string;
    status: PRStatus;
    url: string;
}

export interface Commit {
    sha: string;
    message: string;
    url: string;
}

export interface RepositoryState {
    branches: Branch[];
    lastCommit: Commit;
    status: string;
}

export interface CodeChange {
    filePath: string;
    content: string;
    operation: ChangeOperation;
    lineNumbers?: number[];
}

export type PRStatus = 'open' | 'closed' | 'merged' | 'draft';
export type ChangeOperation = 'create' | 'update' | 'delete';