import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { highlightSpecialChars, drawSelection } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';
import { highlightSelectionMatches } from '@codemirror/search';
import { lintGutter } from '@codemirror/lint';
import { lineNumbers } from '@codemirror/view';
import { keymap } from '@codemirror/view';

// Basic theme for CodeMirror
export const basicTheme = {
    '&': {
        fontSize: '13px',
        backgroundColor: 'transparent',
    },
    '&.cm-focused .cm-selectionBackground, & .cm-selectionBackground': {
        backgroundColor: 'rgba(21, 170, 147, 0.2) !important',
    },
    '.cm-content': {
        lineHeight: '1.5',
    },
};

// Basic setup for CodeMirror
export const getBasicSetup = (isDark: boolean, saveFile: () => void) => {
    return [
        EditorView.theme(basicTheme),
        isDark
            ? EditorView.theme({
                  '&': { color: '#ffffffd9' },
              })
            : EditorView.theme({
                  '&': { color: '#000000d9' },
              }),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        drawSelection(),
        bracketMatching(),
        autocompletion(),
        highlightSelectionMatches(),
        lintGutter(),
        lineNumbers(),
        keymap.of([
            {
                key: 'Mod-s',
                run: () => {
                    saveFile();
                    return true;
                },
            },
        ]),
    ];
};

// Get language extensions for CodeMirror based on file type
export function getLanguageFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'js':
            return 'javascript';
        case 'jsx':
            return 'javascript';
        case 'ts':
            return 'typescript';
        case 'tsx':
            return 'typescript';
        case 'css':
            return 'css';
        case 'html':
            return 'html';
        case 'json':
            return 'json';
        case 'md':
            return 'markdown';
        default:
            return 'typescript';
    }
}

// Get CodeMirror extensions based on file language
export function getExtensions(language: string): any[] {
    switch (language) {
        case 'javascript':
            return [javascript({ jsx: true })];
        case 'typescript':
            return [javascript({ jsx: true, typescript: true })];
        case 'css':
            return [css()];
        case 'html':
            return [html()];
        case 'json':
            return [json()];
        case 'markdown':
            return [markdown()];
        default:
            return [javascript({ jsx: true, typescript: true })];
    }
}
