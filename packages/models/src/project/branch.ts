export interface Branch {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    isDefault: boolean;
    git: {
        branch: string | null;
        commitSha: string | null;
        repoUrl: string | null;
    } | null;
    sandbox: {
        id: string;
    };
}
