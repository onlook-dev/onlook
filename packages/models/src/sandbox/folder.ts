export type FolderNode = {
    name: string;
    fullPath: string;
    images: string[]; // Only need to store the path of the image
    children: Map<string, FolderNode> | null;
};
