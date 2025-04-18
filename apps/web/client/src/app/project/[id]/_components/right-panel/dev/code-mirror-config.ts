import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

// Basic theme for CodeMirror
export const basicTheme = {
    '&': {
        fontSize: '13px',
        backgroundColor: '#263238',
        height: '100%'
    },
    '&.cm-focused .cm-selectionBackground, & .cm-selectionBackground': {
        backgroundColor: 'rgba(128, 203, 196, 0.2) !important',
    },
    '.cm-content': {
        lineHeight: '1.5',
        color: '#EEFFFF'
    },
    '.cm-line': {
        padding: '0 4px',
        borderRadius: '3px'
    },
    // Line highlighting
    '.cm-activeLine': {
        backgroundColor: '#314549 !important',
        borderRadius: '3px'
    },
    '.cm-changedLine': {
        backgroundColor: 'rgba(82, 139, 255, 0.2) !important',
        borderRadius: '3px'
    },
    '.cm-insertedLine': {
        backgroundColor: 'rgba(195, 232, 141, 0.2) !important',
        borderRadius: '3px'
    },
    '.cm-deletedLine': {
        backgroundColor: 'rgba(255, 83, 112, 0.2) !important',
        borderRadius: '3px'
    },
    // Syntax highlighting colors
    '.cm-keyword': { color: '#C792EA !important' },  // Keywords
    '.cm-operator': { color: '#89DDFF !important' },  // Operators
    '.cm-string': { color: '#C3E88D !important' },    // Strings
    '.cm-comment': { color: '#546E7A !important' },   // Comments
    '.cm-function': { color: '#82AAFF !important' },  // Functions
    '.cm-variable': { color: '#EEFFFF !important' },  // Variables
    '.cm-punctuation': { color: '#89DDFF !important' },
    '.cm-property': { color: '#EEFFFF !important' },
    '.cm-number': { color: '#F78C6C !important' },
    '.cm-atom': { color: '#F78C6C !important' },      // Constants/Atoms
    '.cm-meta': { color: '#FFCB6B !important' },      // Meta information
    '.cm-tag': { color: '#F07178 !important' },       // HTML/XML tags
    '.cm-attribute': { color: '#C792EA !important' }, // HTML/XML attributes
    // Gutter styling
    '.cm-gutters': {
        backgroundColor: '#263238 !important',
        borderRight: '1px solid #37474F !important',
        color: '#546E7A !important',
        padding: '0 3px'
    },
    '.cm-activeLineGutter': {
        backgroundColor: '#314549'
    }
};

// Basic setup for CodeMirror
export const getBasicSetup = (isDark: boolean, saveFile: () => void): Extension[] => {
    return [
        EditorView.theme(basicTheme),
        isDark
            ? EditorView.theme({
                  '&': { color: '#ffffffd9' },
              })
            : EditorView.theme({
                  '&': { color: '#000000d9' },
              }),
        basicSetup({
            lineNumbers: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            drawSelection: true,
            bracketMatching: true,
            autocompletion: true,
            highlightSelectionMatches: true,
        }),
        syntaxHighlighting(defaultHighlightStyle),
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
export function getExtensions(language: string): Extension[] {
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
