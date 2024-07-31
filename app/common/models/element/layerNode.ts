export interface LayerNode {
    id: string;
    children?: LayerNode[];
    type: number;
    tagName: string;
    style: {
        display: string;
        flexDirection: string;
    };
    component?: string;
    textContent: string;
}
