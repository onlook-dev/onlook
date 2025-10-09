export interface WebviewMetadata {
    id: string;
    title: string;
    src: string;
}

export enum EditorMode {
    DESIGN = 'design',
    CODE = 'code',
    PREVIEW = 'preview',
    PAN = 'pan',
}

export enum InsertMode {
    INSERT_TEXT = 'insert-text',
    INSERT_DIV = 'insert-div',
    INSERT_IMAGE = 'insert-image',
}

export enum SettingsTabValue {
    SITE = 'site',
    DOMAIN = 'domain',
    PROJECT = 'project',
    PREFERENCES = 'preferences',
    VERSIONS = 'versions',
    ADVANCED = 'advanced',
}

export enum LeftPanelTabValue {
    PAGES = 'pages',
    LAYERS = 'layers',
    COMPONENTS = 'components',
    IMAGES = 'images',
    WINDOWS = 'windows',
    BRAND = 'brand',
    BRANCHES = 'branches',
    APPS = 'apps',
}

export enum BrandTabValue {
    COLORS = 'colors',
    FONTS = 'fonts',
}

export enum BranchTabValue {
    MANAGE = 'manage',
}

export enum MouseAction {
    MOVE = 'move',
    MOUSE_DOWN = 'click',
    DOUBLE_CLICK = 'double-click',
}
