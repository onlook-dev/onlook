export interface WebviewMetadata {
    id: string;
    title: string;
    src: string;
}

export interface TemplateTagPosition {
    line: number;
    column: number;
}

export interface TemplateTag {
    start: TemplateTagPosition
    end: TemplateTagPosition
}

export interface TemplateNode {
    path: string,
    startTag: TemplateTag,
    endTag: TemplateTag,
    commit: string,
}