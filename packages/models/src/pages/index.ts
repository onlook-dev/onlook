export interface PageNode {
    id: string;
    path: string;
    name: string;
    children?: PageNode[];
    isActive: boolean;
}
