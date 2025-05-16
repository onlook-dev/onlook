export interface Project {
    id: string;
    name: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        previewImg: string | null;
        description: string | null;
    };
    sandbox: {
        id: string;
        url: string;
    };
}
