export enum Orientation {
    Potrait = 'Potrait',
    Landscape = 'Landscape',
}

export enum Theme {
    Light = 'light',
    Dark = 'dark',
    Device = 'device',
}

export enum EditorAttributes {
    // DOM attributes
    ONLOOK_TOOLBAR = 'onlook-toolbar',
    ONLOOK_RECT_ID = 'onlook-rect',
    ONLOOK_STYLESHEET_ID = 'onlook-stylesheet',
    ONLOOK_STUB_ID = 'onlook-drag-stub',
    ONLOOK_MOVE_KEY_PREFIX = 'olk-',
    OVERLAY_CONTAINER_ID = 'overlay-container',
    CANVAS_CONTAINER_ID = 'canvas-container',

    // IDs
    DATA_ONLOOK_ID = 'data-oid',
    DATA_ONLOOK_INSTANCE_ID = 'data-oiid',
    DATA_ONLOOK_DOM_ID = 'data-odid',
    DATA_ONLOOK_COMPONENT_NAME = 'data-ocname',

    // Data attributes
    DATA_ONLOOK_IGNORE = 'data-onlook-ignore',
    DATA_ONLOOK_INSERTED = 'data-onlook-inserted',
    DATA_ONLOOK_DRAG_SAVED_STYLE = 'data-onlook-drag-saved-style',
    DATA_ONLOOK_DRAGGING = 'data-onlook-dragging',
    DATA_ONLOOK_DRAG_DIRECTION = 'data-onlook-drag-direction',
    DATA_ONLOOK_DRAG_START_POSITION = 'data-onlook-drag-start-position',
    DATA_ONLOOK_NEW_INDEX = 'data-onlook-new-index',
    DATA_ONLOOK_EDITING_TEXT = 'data-onlook-editing-text',
    DATA_ONLOOK_DYNAMIC_TYPE = 'data-onlook-dynamic-type',
    DATA_ONLOOK_CORE_ELEMENT_TYPE = 'data-onlook-core-element-type',
    ONLOOK_DEFAULT_STYLESHEET_ID = 'onlook-default-stylesheet',
}

export enum WebviewChannels {
    // To Webview
    WEBVIEW_ID = 'webview-id',
    UPDATE_STYLE = 'update-style',
    INSERT_ELEMENT = 'insert-element',
    REMOVE_ELEMENT = 'remove-element',
    MOVE_ELEMENT = 'move-element',
    EDIT_ELEMENT_TEXT = 'edit-element-text',
    CLEAN_AFTER_WRITE_TO_CODE = 'clean-after-write',
    GROUP_ELEMENTS = 'group-elements',
    UNGROUP_ELEMENTS = 'ungroup-elements',
    UPDATE_ELEMENT_INSTANCE_ID = 'update-element-instance-id',

    // From Webview
    ELEMENT_INSERTED = 'element-inserted',
    ELEMENT_REMOVED = 'element-removed',
    ELEMENT_MOVED = 'element-moved',
    ELEMENT_TEXT_EDITED = 'element-text-edited',
    ELEMENT_GROUPED = 'element-grouped',
    ELEMENT_UNGROUPED = 'element-ungrouped',
    STYLE_UPDATED = 'style-updated',
    WINDOW_RESIZED = 'window-resized',
    WINDOW_MUTATED = 'window-mutated',
    DOM_PROCESSED = 'dom-processed',
    GET_WEBVIEW_ID = 'get-webview-id',
}

export enum MainChannels {
    RELOAD_APP = 'reload-app',
    OPEN_IN_EXPLORER = 'open-in-explorer',
    OPEN_EXTERNAL_WINDOW = 'open-external-window',
    QUIT_AND_INSTALL = 'quit-and-update-app',
    UPDATE_DOWNLOADED = 'update-downloaded',
    UPDATE_NOT_AVAILABLE = 'update-not-available',
    SAVE_IMAGE = 'save-image',
    GET_IMAGE = 'get-image',
    SEND_WINDOW_COMMAND = 'send-window-command',
    CHECK_REQUIREMENTS = 'check-requirements',

    // Code
    GET_CODE_BLOCK = 'get-code-block',
    GET_CODE_BLOCKS = 'get-code-blocks',
    GET_FILE_CONTENT = 'get-file-content',
    GET_AND_WRITE_CODE_DIFFS = 'get-and-write-code-diffs',
    WRITE_CODE_DIFFS = 'write-code-diffs',
    VIEW_SOURCE_CODE = 'view-source-code',
    VIEW_SOURCE_FILE = 'view-source-file',
    PICK_COMPONENTS_DIRECTORY = 'pick-directory',
    GET_COMPONENTS = 'get-components',
    CLEAN_CODE_KEYS = 'clean-move-keys',

    // Analytics
    UPDATE_ANALYTICS_PREFERENCE = 'update-analytics-preference',
    SEND_ANALYTICS = 'send-analytics',
    SEND_ANALYTICS_ERROR = 'send-analytics-error',
    // Ast
    GET_TEMPLATE_NODE_AST = 'get-template-node-ast',
    GET_TEMPLATE_NODE_CHILD = 'get-template-node-child',
    GET_TEMPLATE_NODE_CLASS = 'get-template-node-classes',

    // Auth
    USER_SIGNED_IN = 'user-signed-in',
    USER_SIGNED_OUT = 'user-signed-out',
    GET_USER_METADATA = 'get-user-metadata',
    SIGN_OUT = 'sign-out',

    // Storage
    GET_USER_SETTINGS = 'get-user-settings',
    GET_APP_STATE = 'get-app-state',
    GET_PROJECTS = 'get-projects',

    UPDATE_USER_SETTINGS = 'update-user-settings',
    REPLACE_APP_STATE = 'replace-app-state',
    UPDATE_PROJECTS = 'update-projects',

    // Create
    CREATE_NEW_PROJECT = 'create-new-project',
    CREATE_NEW_PROJECT_CALLBACK = 'create-new-project-callback',
    VERIFY_PROJECT = 'verify-project',
    VERIFY_PROJECT_CALLBACK = 'verify-project-callback',
    SETUP_PROJECT = 'setup-project',
    SETUP_PROJECT_CALLBACK = 'setup-project-callback',

    // Chat
    SEND_CHAT_MESSAGES_STREAM = 'send-chat-messages-stream',
    SEND_STOP_STREAM_REQUEST = 'send-stop-stream-request',
    CHAT_STREAM_PARTIAL = 'chat-stream-partial',
    CHAT_STREAM_FINAL_MESSAGE = 'chat-stream-final',
    CHAT_STREAM_ERROR = 'chat-stream-error',
    GET_CONVERSATIONS_BY_PROJECT = 'get-conversations-by-project',
    SAVE_CONVERSATION = 'save-conversation',
    DELETE_CONVERSATION = 'delete-conversation',

    // Run
    RUN_START = 'run-start',
    RUN_STOP = 'run-stop',
    RUN_RESTART = 'run-restart',
    GET_TEMPLATE_NODE = 'get-template-node',
    RUN_STATE_CHANGED = 'run-state-changed',
    GET_RUN_STATE = 'get-run-state',
    RUN_COMMAND = 'run-command',

    // Terminal
    TERMINAL_CREATE = 'terminal-create',
    TERMINAL_ON_DATA = 'terminal-on-data',
    TERMINAL_INPUT = 'terminal-input',
    TERMINAL_EXECUTE_COMMAND = 'terminal-execute-command',
    TERMINAL_RESIZE = 'terminal-resize',
    TERMINAL_KILL = 'terminal-kill',
    TERMINAL_GET_HISTORY = 'terminal-get-history',

    // Hosting
    START_DEPLOYMENT = 'start-deployment',
    DEPLOY_STATE_CHANGED = 'deploy-state-changed',
    UNPUBLISH_HOSTING_ENV = 'unpublish-hosting-env',
}

export enum Links {
    DISCORD = 'https://discord.gg/hERDfFZCsH',
    GITHUB = 'https://github.com/onlook-dev/onlook',
    USAGE_DOCS = 'https://github.com/onlook-dev/onlook/wiki/How-to-set-up-my-project%3F',
    WIKI = 'https://github.com/onlook-dev/onlook/wiki',
    OPEN_ISSUE = 'https://github.com/onlook-dev/onlook/issues/new/choose',
}

export const APP_NAME = 'Onlook';
export const APP_SCHEMA = 'onlook';
export const HOSTING_DOMAIN = 'onlook.live';
export const MAX_NAME_LENGTH = 50;
export const DefaultSettings = {
    SCALE: 0.6,
    POSITION: { x: 300, y: 50 },
    URL: 'http://localhost:3000/',
    FRAME_POSITION: { x: 0, y: 0 },
    FRAME_DIMENSION: { width: 1536, height: 960 },
    DUPLICATE: false,
    LINKED_IDS: [],
    ASPECT_RATIO_LOCKED: false,
    DEVICE: 'Custom:Custom',
    THEME: Theme.Device,
    ORIENTATION: Orientation.Potrait,
    MIN_DIMENSIONS: { width: '280px', height: '360px' },
};

export const DOM_IGNORE_TAGS = ['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT'];

export const INLINE_ONLY_CONTAINERS = new Set([
    'a',
    'abbr',
    'area',
    'audio',
    'b',
    'bdi',
    'bdo',
    'br',
    'button',
    'canvas',
    'cite',
    'code',
    'data',
    'datalist',
    'del',
    'dfn',
    'em',
    'embed',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'i',
    'iframe',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'li',
    'map',
    'mark',
    'meter',
    'noscript',
    'object',
    'output',
    'p',
    'picture',
    'progress',
    'q',
    'ruby',
    's',
    'samp',
    'script',
    'select',
    'slot',
    'small',
    'span',
    'strong',
    'sub',
    'sup',
    'svg',
    'template',
    'textarea',
    'time',
    'u',
    'var',
    'video',
    'wbr',
]);
