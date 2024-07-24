export interface TemplateNode {
    path: string;
    startTag: TemplateTag;
    endTag: TemplateTag;
    commit: string;
    name?: string;
}

export interface TemplateTag {
    start: TemplateTagPosition;
    end: TemplateTagPosition;
}

export interface TemplateTagPosition {
    line: number;
    column: number;
}
