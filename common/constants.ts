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
    UPDATE_STYLE = "updateStyle",
}
export enum MainChannels {
    WEBVIEW_PRELOAD_PATH = 'webview-preload-path',
    OPEN_CODE_BLOCK = "openCodeBlock",
    WRITE_STYLE_TO_CODE = "writeStyleToCode",
    OPEN_TUNNEL = "openTunnel",
}

export const APP_NAME = 'Onlook';