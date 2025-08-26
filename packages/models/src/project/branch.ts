export interface Branch {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    git: {
        branch: string | null;
        commitSha: string | null;
        repoUrl: string | null;
    } | null;
    sandbox: {
        id: string;
    };
}
