export interface LayerNode {
    id: string;
    textContent: string;
    tagName: string;
    encodedTemplateNode?: string | null;
    children?: LayerNode[];
}
