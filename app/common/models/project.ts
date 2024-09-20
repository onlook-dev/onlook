export interface Project {
    id: string;
    name: string;
    folderPath: string;
    url: string;
    previewImg?: string;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
}
