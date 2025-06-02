export interface Project {
    id: string;
    name: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        previewImg: {
            fullPath: string;
            id: string;
            path: string;
        } | null;
        description: string | null;
    };
    sandbox: {
        id: string;
        url: string;
    };
}
