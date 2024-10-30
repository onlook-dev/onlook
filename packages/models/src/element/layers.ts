export interface LayerNode {
    id: string;
    textContent: string;
    tagName: string;
    isVisible: boolean;
    children?: LayerNode[];
}
