export enum EditorAttributes {
    // DOM attributes
    ONLOOK_TOOLBAR = 'onlook-toolbar',
    ONLOOK_RECT_ID = 'onlook-rect',
    ONLOOK_STYLESHEET_ID = 'onlook-stylesheet',

    // Data attributes
    DATA_ONLOOK_ID = 'data-onlook-id',
    DATA_ONLOOK_IGNORE = 'data-onlook-ignore',
    DATA_ONLOOK_INSERTED = 'data-onlook-inserted',
    DATA_ONLOOK_TIMESTAMP = 'data-onlook-timestamp',
}

export enum WebviewChannels {
    // To Webview
    UPDATE_STYLE = 'update-style',
    INSERT_ELEMENT = 'insert-element',
    REMOVE_ELEMENT = 'remove-element',
    CLEAR_STYLE_SHEET = 'clear-style-sheet',

    // From Webview
    ELEMENT_INSERTED = 'element-inserted',
    ELEMENT_REMOVED = 'element-removed',
    STYLE_UPDATED = 'style-updated',
    WINDOW_RESIZED = 'window-resize',
    WINDOW_MUTATED = 'window-mutate',
}

export enum MainChannels {
    // Code
    GET_CODE_BLOCK = 'get-code-block',
    GET_CODE_BLOCKS = 'get-code-blocks',
    GET_CODE_DIFFS = 'get-code-diffs',
    WRITE_CODE_BLOCKS = 'write-code-blocks',
    VIEW_SOURCE_CODE = 'view-source-code',

    // Tunnel
    OPEN_TUNNEL = 'open-tunnel',
    CLOSE_TUNNEL = 'close-tunnel',

    // Analytics
    ANLYTICS_PREF_SET = 'analytics-pref-set',
    SEND_ANALYTICS = 'send-analytics',
    GET_USER_SETTINGS = 'get-user-settings',

    // Ast
    GET_TEMPLATE_NODE_AST = 'get-template-node-ast',
    GET_TEMPLATE_NODE_CHILD = 'get-template-node-child',
}

export enum Links {
    DISCORD = 'https://discord.gg/hERDfFZCsH',
    GITHUB = 'https://github.com/onlook-dev/studio',
    USAGE_DOCS = 'https://github.com/onlook-dev/studio?tab=readme-ov-file#usage',
    WIKI = 'https://github.com/onlook-dev/studio/wiki',
    OPEN_ISSUE = 'https://github.com/onlook-dev/studio/issues/new/choose',
}

export const APP_NAME = 'Onlook';
