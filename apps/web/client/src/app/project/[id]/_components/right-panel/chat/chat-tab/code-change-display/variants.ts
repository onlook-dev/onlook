import type * as monaco from 'monaco-editor';

export const VARIANTS: Record<
    'minimal' | 'normal',
    monaco.editor.IStandaloneDiffEditorConstructionOptions
> = {
    minimal: {
        fontSize: 12,
        lineNumbers: 'off',
        // @ts-expect-error - This exists
        tabSize: 1,
        padding: {
            top: 10,
            bottom: 10,
        },
        minimap: {
            enabled: false,
        },
        scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            alwaysConsumeMouseWheel: false,
        },
    },
    normal: {
        fontSize: 14,
        lineNumbers: 'on',
        // @ts-expect-error - This exists
        tabSize: 2,
        padding: {
            top: 12,
            bottom: 12,
        },
        minimap: {
            enabled: false,
        },
    },
};
