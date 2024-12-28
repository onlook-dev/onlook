export interface WebviewMetadata {
    id: string;
    title: string;
    src: string;
}

export enum EditorMode {
    DESIGN = 'design',
    INTERACT = 'interact',
    PAN = 'pan',
    INSERT_TEXT = 'insert-text',
    INSERT_ELEMENT = 'insert-element',
    INSERT_BUTTON = 'insert-button',
    INSERT_INPUT = 'insert-input',
}

export enum EditorTabValue {
    STYLES = 'styles',
    CHAT = 'chat',
}
