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
    INSERT_DIV = 'insert-div',
    INSERT_MAIN_BUTTON = 'insert-main-button',
    INSERT_MAIN_INPUT = 'insert-main-input',
    Dropdown = 'Dropdown',
    INSERT_ELEMENT = 'INSERT_ELEMENT',
}
