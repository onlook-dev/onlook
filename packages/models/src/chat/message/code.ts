export interface CodeBlock {
    fileName?: string;
    language?: string;
    content: string;
}

export interface CodeSearchReplace {
    search: string;
    replace: string;
}
