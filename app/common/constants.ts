export enum EditorAttributes {
    ONLOOK_TOOLBAR = "onlook-toolbar",
    ONLOOK_RECT_ID = "onlook-rect",
    ONLOOK_STYLESHEET_ID = 'onlook-stylesheet',

    DATA_ONLOOK_ID = "data-onlook-id",
    DATA_ONLOOK_IGNORE = "data-onlook-ignore",
    DATA_ONLOOK_SAVED = "data-onlook-saved",
    DATA_ONLOOK_SNAPSHOT = "data-onlook-snapshot",
    DATA_ONLOOK_OLD_VALS = "data-onlook-old-vals",
    DATA_ONLOOK_COMPONENT_ID = "data-onlook-component-id",
}

export enum WebviewChannels {
    STYLE_UPDATED = "style-updated",
    UPDATE_STYLE = "update-style",
    CLEAR_STYLE_SHEET = "clear-style-sheet",
}

export enum MainChannels {
    WEBVIEW_PRELOAD_PATH = 'webview-preload-path',
    OPEN_CODE_BLOCK = "open-code-block",
    WRITE_CODE_BLOCK = "write-code-block",
    GET_STYLE_CODE = "get-style-code",
    OPEN_TUNNEL = "open-tunnel",
    CLOSE_TUNNEL = "close-tunnel",
}

export const APP_NAME = 'Onlook';