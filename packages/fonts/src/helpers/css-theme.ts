import type { Font } from '@onlook/models';

const THEME_BLOCK_REGEX = /@theme(?:\s+inline)?\s*\{/g;

function findThemeBlock(content: string): { start: number; bodyStart: number; end: number } | null {
    const match = THEME_BLOCK_REGEX.exec(content);
    THEME_BLOCK_REGEX.lastIndex = 0;

    if (!match) {
        return null;
    }

    const bodyStart = match.index + match[0].length;
    let depth = 1;

    for (let index = bodyStart; index < content.length; index++) {
        const char = content[index];
        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                return {
                    start: match.index,
                    bodyStart,
                    end: index,
                };
            }
        }
    }

    return null;
}

function getThemeFontVariableName(fontId: string): string {
    return `--font-${fontId}`;
}

function getFontThemeDeclaration(font: Font): string {
    const themeVariable = getThemeFontVariableName(font.id);
    const fontVariable = font.variable || themeVariable;

    return `${themeVariable}: var(${fontVariable});`;
}

export function addFontToCssTheme(font: Font, content: string): string {
    const declaration = getFontThemeDeclaration(font);
    const themeVariable = getThemeFontVariableName(font.id);
    const existingDeclarationRegex = new RegExp(`(^\\s*)${themeVariable}\\s*:[^;]+;`, 'm');

    if (existingDeclarationRegex.test(content)) {
        return content.replace(existingDeclarationRegex, `$1${declaration}`);
    }

    const block = findThemeBlock(content);
    if (!block) {
        const separator = content.endsWith('\n') ? '\n' : '\n\n';
        return `${content}${separator}@theme inline {\n    ${declaration}\n}\n`;
    }

    const beforeClose = content.slice(0, block.end).replace(/\s*$/, '');
    const afterClose = content.slice(block.end);

    return `${beforeClose}\n    ${declaration}\n${afterClose}`;
}

export function removeFontFromCssTheme(fontId: string, content: string): string {
    const themeVariable = getThemeFontVariableName(fontId);
    const declarationRegex = new RegExp(`\\n?\\s*${themeVariable}\\s*:[^;]+;`, 'g');

    return content.replace(declarationRegex, '');
}
