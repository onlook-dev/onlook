import { autocompletion } from '@codemirror/autocomplete';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { lintGutter } from '@codemirror/lint';
import { highlightSelectionMatches } from '@codemirror/search';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view';
import { tags } from '@lezer/highlight';

// Custom colors for CodeMirror
const customColors = {
    orange: '#FFAC60',
    purple: '#C478FF',
    blue: '#3FA4FF',
    green: '#1AC69C',
    pink: '#FF32C6'
}

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

//dark theme for code editor
export const customDarkTheme = EditorView.theme({
    '&': {
        color: '#ffffff',
        backgroundColor: '#000000',
        fontSize: '13px',
        userSelect: 'none !important',
    },
    '.cm-content': {
        padding: '10px 0',
        lineHeight: '1.5',
        caretColor: customColors.blue,
        backgroundColor: '#000000',
        userSelect: 'text !important',
    },
    '.cm-focused': {
        outline: 'none',
    },
    '&.cm-focused .cm-cursor': {
        borderLeftColor: customColors.blue,
        borderLeftWidth: '2px'
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: 'rgba(63, 164, 255, 0.2)',
    },
    '&.cm-editor.cm-focused .cm-selectionBackground': {
        backgroundColor: `${customColors.green}33 !important`,
    },
    '&.cm-editor .cm-selectionBackground': {
        backgroundColor: `${customColors.green}33 !important`,
    },
    '&.cm-editor .cm-content ::selection': {
        backgroundColor: `${customColors.green}33 !important`,
    },
    '.cm-line ::selection': {
        backgroundColor: `${customColors.green}33 !important`,
    },
    '::selection': {
        backgroundColor: `${customColors.green}33 !important`,
    },
    '.cm-selectionBackground': {
        backgroundColor: 'rgba(63, 164, 255, 0.2)',
    },
    '.cm-gutters': {
        backgroundColor: '#0a0a0a !important',
        color: '#6b7280 !important',
        border: 'none !important',
        borderRight: '1px solid #1f2937 !important'
    },
    '.cm-gutterElement': {
        color: '#6b7280'
    },
    '.cm-lineNumbers .cm-gutterElement': {
        color: '#6b7280',
        fontSize: '12px'
    },
    '.cm-activeLine': {
        backgroundColor: 'rgba(255, 255, 255, 0.02)'
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)'
    },
    '.cm-foldPlaceholder': {
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        color: customColors.blue
    },
    // Scrollbar styling
    '.cm-scroller::-webkit-scrollbar': {
        width: '8px',
        height: '8px'
    },
    '.cm-scroller::-webkit-scrollbar-track': {
        backgroundColor: '#0a0a0a'
    },
    '.cm-scroller::-webkit-scrollbar-thumb': {
        backgroundColor: '#374151',
        borderRadius: '4px'
    },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': {
        backgroundColor: '#4b5563'
    },
    '.cm-search-highlight': {
        backgroundColor: 'rgba(26, 198, 156, 0.3)',
        borderRadius: '2px'
    },
}, { dark: true });

// Custom syntax highlighting with the specified colors
export const customDarkHighlightStyle = HighlightStyle.define([
    // Keywords (if, for, function, etc.) - Pink 
    { tag: tags.keyword, color: customColors.pink, fontWeight: 'bold' },
    { tag: tags.controlKeyword, color: customColors.pink, fontWeight: 'bold' },
    { tag: tags.operatorKeyword, color: customColors.pink },

    // Strings - Blue
    { tag: tags.string, color: customColors.blue },
    { tag: tags.regexp, color: customColors.blue },

    // Numbers - Pink, bool purple, null pink
    { tag: tags.number, color: customColors.pink },
    { tag: tags.bool, color: customColors.purple },
    { tag: tags.null, color: customColors.pink },

    // Functions - purple and methods - pink
    { tag: tags.function(tags.variableName), color: customColors.purple },
    { tag: tags.function(tags.propertyName), color: customColors.pink },


    // Variables-purple and properties - Green
    { tag: tags.variableName, color: customColors.purple },
    { tag: tags.propertyName, color: customColors.green },
    { tag: tags.attributeName, color: customColors.green },

    // Types and classes - Purple (lighter shade)
    { tag: tags.typeName, color: '#E879F9' },
    { tag: tags.className, color: '#E879F9' },
    { tag: tags.namespace, color: '#E879F9' },

    // Comments - Gray
    { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' },
    { tag: tags.lineComment, color: '#6b7280', fontStyle: 'italic' },
    { tag: tags.blockComment, color: '#6b7280', fontStyle: 'italic' },

    // Operators - White/Light Gray
    { tag: tags.operator, color: '#d1d5db' },
    { tag: tags.punctuation, color: '#d1d5db' },
    { tag: tags.bracket, color: '#d1d5db' },

    // Tags (HTML/JSX) - Pink
    { tag: tags.tagName, color: customColors.pink },
    { tag: tags.angleBracket, color: '#d1d5db' },

    // Special tokens
    { tag: tags.atom, color: customColors.pink },
    { tag: tags.literal, color: customColors.orange },
    { tag: tags.unit, color: customColors.pink },

    // Invalid/Error
    { tag: tags.invalid, color: '#ef4444', textDecoration: 'underline' }
]);

const searchHighlightEffect = StateEffect.define<{ term: string }>();
const clearHighlightEffect = StateEffect.define();

const searchHighlightField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes);

        for (let effect of tr.effects) {
            if (effect.is(searchHighlightEffect)) {
                const { term } = effect.value;
                if (!term || term.length < 2) {
                    decorations = Decoration.none;
                    continue;
                }

                const content = tr.state.doc.toString();
                const termLower = term.toLowerCase();
                const contentLower = content.toLowerCase();
                const newDecorations = [];

                let index = 0;
                while ((index = contentLower.indexOf(termLower, index)) !== -1) {
                    const from = index;
                    const to = index + term.length;
                    newDecorations.push(
                        Decoration.mark({
                            class: 'cm-search-highlight'
                        }).range(from, to)
                    );
                    index = to;
                }

                decorations = Decoration.set(newDecorations);
            } else if (effect.is(clearHighlightEffect)) {
                decorations = Decoration.none;
            }
        }

        return decorations;
    },
    provide: f => EditorView.decorations.from(f)
});

export function createSearchHighlight(term: string) {
    return searchHighlightEffect.of({ term });
}

export function clearSearchHighlight() {
    return clearHighlightEffect.of(null);
}

export function scrollToFirstMatch(view: EditorView, term: string): boolean {
    if (!term || term.length < 2) return false;

    const content = view.state.doc.toString();
    const termLower = term.toLowerCase();
    const contentLower = content.toLowerCase();

    const firstMatch = contentLower.indexOf(termLower);
    if (firstMatch !== -1) {
        const pos = firstMatch;
        view.dispatch({
            effects: EditorView.scrollIntoView(pos, {
                y: 'center'
            })
        });
        return true;
    }

    return false;
}

export const getBasicSetup = (saveFile: () => void) => {
    const baseExtensions = [
        highlightActiveLine(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        drawSelection(),
        bracketMatching(),
        autocompletion(),
        highlightSelectionMatches(),
        lintGutter(),
        lineNumbers(),
        searchHighlightField,
        keymap.of([
            {
                key: 'Mod-s',
                run: () => {
                    saveFile();
                    return true;
                },
            },
        ]),

        customDarkTheme,
        syntaxHighlighting(customDarkHighlightStyle)
    ];

    return baseExtensions;
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
