import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { keymap } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';

// Basic setup for CodeMirror
export const getBasicSetup = (saveFile: () => void): Extension[] => {
    return [
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

// Get language extensions for CodeMirror based on file language
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

// Get language from file name
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
