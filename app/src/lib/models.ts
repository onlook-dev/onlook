export interface WebviewMetadata {
    id: string;
    title: string;
    src: string;
}

export enum EditorMode {
    Design = 'Design',
    Interact = 'Interact',
    Pan = 'Pan',
    InsertText = 'InsertText',
    InsertDiv = 'InsertDiv',
}
