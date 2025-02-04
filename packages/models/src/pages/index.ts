export interface PageNode {
    path: string;
    name: string;
    children?: PageNode[];
    isActive: boolean;
}
