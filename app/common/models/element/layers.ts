export interface LayerNode {
    id: string;
    textContent: string;
    tagName: string;
    visibility: boolean;
    children?: LayerNode[];
}
