export interface LayerNode {
    id: string;
    textContent: string;
    tagName: string;
    children?: LayerNode[];
}
