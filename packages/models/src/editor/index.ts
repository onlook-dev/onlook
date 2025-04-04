export enum MouseAction {
    MOVE = 'move',
    MOUSE_DOWN = 'click',
    DOUBLE_CLICK = 'double-click',
}

export interface WebviewMetadata {
    id: string;
    title: string;
    src: string;
}

export enum EditorMode {
    DESIGN = 'design',
    PREVIEW = 'preview',
    PAN = 'pan',
    INSERT_TEXT = 'insert-text',
    INSERT_DIV = 'insert-div',
    INSERT_IMAGE = 'insert-image',
}

export enum EditorTabValue {
    STYLES = 'styles',
    CHAT = 'chat',
    PROPS = 'properties',
}

export enum SettingsTabValue {
    DOMAIN = 'domain',
    PROJECT = 'project',
    PREFERENCES = 'preferences',
    VERSIONS = 'versions',
    ADVANCED = 'advanced',
}
