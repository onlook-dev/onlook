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
    INSERT_IMAGE = 'insert-image',
    REMOVE_IMAGE = 'remove-image',

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
    DELETE_FOLDER = 'delete-folder',
    IS_CHILD_TEXT_EDITABLE = 'is-child-text-editable',
    IS_PORT_AVAILABLE = 'is-port-available',
    CLEAN_UP_BEFORE_QUIT = 'clean-up-before-quit',

    // Code
    GET_CODE_BLOCK = 'get-code-block',
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
    GET_TEMPLATE_NODE_PROPS = 'get-template-node-props',

    // Auth
    SIGN_IN = 'sign-in',
    SIGN_OUT = 'sign-out',
    USER_SIGNED_IN = 'user-signed-in',
    USER_SIGNED_OUT = 'user-signed-out',
    GET_USER_METADATA = 'get-user-metadata',
    UPDATE_USER_METADATA = 'update-user-metadata',
    IS_USER_SIGNED_IN = 'is-user-signed-in',

    // Storage
    GET_USER_SETTINGS = 'get-user-settings',
    GET_APP_STATE = 'get-app-state',
    GET_PROJECTS = 'get-projects',

    UPDATE_USER_SETTINGS = 'update-user-settings',
    REPLACE_APP_STATE = 'replace-app-state',
    UPDATE_PROJECTS = 'update-projects',

    // Create
    GET_CREATE_PROJECT_PATH = 'get-create-project-path',
    CREATE_NEW_PROJECT = 'create-new-project',
    CREATE_NEW_PROJECT_CALLBACK = 'create-new-project-callback',
    SETUP_PROJECT = 'setup-project',
    SETUP_PROJECT_CALLBACK = 'setup-project-callback',
    INSTALL_PROJECT_DEPENDENCIES = 'install-project-dependencies',
    REINSTALL_PROJECT_DEPENDENCIES = 'reinstall-project-dependencies',
    CREATE_NEW_PROJECT_PROMPT = 'create-new-project-prompt',
    CREATE_NEW_BLANK_PROJECT = 'create-new-blank-project',
    CREATE_NEW_PROJECT_PROMPT_CALLBACK = 'create-new-project-prompt-callback',
    CANCEL_CREATE_NEW_PROJECT_PROMPT = 'cancel-create-new-project-prompt',

    // Chat
    SEND_CHAT_MESSAGES_STREAM = 'send-chat-messages-stream',
    SEND_STOP_STREAM_REQUEST = 'send-stop-stream-request',
    CHAT_STREAM_PARTIAL = 'chat-stream-partial',
    CHAT_STREAM_ERROR = 'chat-stream-error',
    GET_CONVERSATIONS_BY_PROJECT = 'get-conversations-by-project',
    SAVE_CONVERSATION = 'save-conversation',
    DELETE_CONVERSATION = 'delete-conversation',
    GENERATE_SUGGESTIONS = 'generate-suggestions',
    GET_SUGGESTIONS_BY_PROJECT = 'get-suggestions-by-project',
    SAVE_SUGGESTIONS = 'save-suggestions',
    GENERATE_CHAT_SUMMARY = 'generate-chat-summary',

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
    PUBLISH_TO_DOMAIN = 'publish-to-domain',
    UNPUBLISH_DOMAIN = 'unpublish-domain',
    PUBLISH_STATE_CHANGED = 'publish-state-changed',
    GET_OWNED_DOMAINS = 'get-owned-domains',
    CREATE_DOMAIN_VERIFICATION = 'create-domain-verification',
    VERIFY_DOMAIN = 'verify-domain',

    // Payment
    CREATE_STRIPE_CHECKOUT = 'create-stripe-checkout',
    CHECK_SUBSCRIPTION = 'check-subscription',
    MANAGE_SUBSCRIPTION = 'manage-subscription',

    // Pages
    SCAN_PAGES = 'scan-pages',
    CREATE_PAGE = 'create-page',
    DELETE_PAGE = 'delete-page',
    RENAME_PAGE = 'rename-page',
    DUPLICATE_PAGE = 'duplicate-page',

    // Images
    SCAN_IMAGES_IN_PROJECT = 'scan-images-in-project',
    SAVE_IMAGE_TO_PROJECT = 'save-image-to-project',
    DELETE_IMAGE_FROM_PROJECT = 'delete-image-from-project',
    RENAME_IMAGE_IN_PROJECT = 'rename-image-in-project',

    // Config
    SCAN_TAILWIND_CONFIG = 'scan-tailwind-config',
    UPDATE_TAILWIND_CONFIG = 'update-tailwind-config',
    DELETE_TAILWIND_CONFIG = 'delete-tailwind-config',

    // Fonts
    SCAN_FONTS = 'scan-fonts-config',
    ADD_FONT = 'add-font',
    REMOVE_FONT = 'remove-font',
    SET_FONT = 'set-font',
    GET_DEFAULT_FONT = 'get-default-font',
    UPLOAD_FONTS = 'upload-fonts',
    WATCH_FONT_FILE = 'watch-font-file',

    // Trainloop
    SAVE_APPLY_RESULT = 'save-apply-result',
}

export enum GitChannels {
    IS_REPO_INITIALIZED = 'is-repo-initialized',
    IS_EMPTY_COMMIT = 'is-empty-commit',
    INIT_REPO = 'init-repo',
    ADD = 'add',
    ADD_ALL = 'add-all',
    STATUS = 'status',
    COMMIT = 'commit',
    CHECKOUT = 'checkout',
    LIST_COMMITS = 'list-commits',
    BRANCH = 'branch',
    GET_CURRENT_COMMIT = 'get-current-commit',
    RENAME_COMMIT = 'rename-commit',
}

export type Channels = MainChannels | GitChannels;
