import { DEFAULT_IDE } from '../ide/index.ts';

export const APP_NAME = 'Onlook';
export const APP_SCHEMA = 'onlook';
export const HOSTING_DOMAIN = 'onlook.live';
export const CUSTOM_OUTPUT_DIR = '.next-prod';
export const MAX_NAME_LENGTH = 50;

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

export enum Links {
    DISCORD = 'https://discord.gg/hERDfFZCsH',
    GITHUB = 'https://github.com/onlook-dev/onlook',
    USAGE_DOCS = 'https://github.com/onlook-dev/onlook/wiki/How-to-set-up-my-project%3F',
    WIKI = 'https://github.com/onlook-dev/onlook/wiki',
    OPEN_ISSUE = 'https://github.com/onlook-dev/onlook/issues/new/choose',
}

export enum Orientation {
    Potrait = 'Potrait',
    Landscape = 'Landscape',
}

export enum Theme {
    Light = 'light',
    Dark = 'dark',
    Device = 'device',
}

export const DefaultSettings = {
    SCALE: 0.7,
    PAN_POSITION: { x: 175, y: 100 },
    URL: 'http://localhost:3000/',
    FRAME_POSITION: { x: 0, y: 0 },
    FRAME_DIMENSION: { width: 1536, height: 960 },
    ASPECT_RATIO_LOCKED: false,
    DEVICE: 'Custom:Custom',
    THEME: Theme.Device,
    ORIENTATION: Orientation.Potrait,
    MIN_DIMENSIONS: { width: '280px', height: '360px' },
    COMMANDS: {
        run: 'npm run dev',
        build: 'npm run build',
        install: 'npm install',
    },
    IMAGE_FOLDER: 'public/images',
    IMAGE_DIMENSION: { width: '100px', height: '100px' },
    CHAT_SETTINGS: {
        showSuggestions: true,
        autoApplyCode: true,
        expandCodeBlocks: false,
    },
    EDITOR_SETTINGS: {
        shouldWarnDelete: true,
        ideType: DEFAULT_IDE,
    },
};
