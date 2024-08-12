export interface LayerNode {
    id: string;
    textContent: string;
    type: number;
    tagName: string;
    style: {
        display: string;
        flexDirection: string;
    };
    children?: LayerNode[];
}
