export interface FolderNode {
    name: string;
    path: string;
    fullPath: string;
    images: string[]; // Only need to store the path of the image
    children: Map<string, FolderNode>;
}
