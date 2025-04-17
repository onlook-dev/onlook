import { type CoreElementType, type DynamicType } from './layers';

export interface TemplateNode {
    path: string;
    startTag: TemplateTag;
    endTag: TemplateTag | null;
    component: string | null;
    dynamicType: DynamicType | null;
    coreElementType: CoreElementType | null;
}

export interface TemplateTag {
    start: TemplateTagPosition;
    end: TemplateTagPosition;
}

export interface TemplateTagPosition {
    line: number;
    column: number;
}
