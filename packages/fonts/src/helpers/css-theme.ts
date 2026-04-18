import type { Font } from '@onlook/models';

const THEME_BLOCK_REGEX = /@theme(?:\s+inline)?\s*\{/g;

function findThemeBlock(content: string): { bodyStart: number; bodyEnd: number } | null {
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
                    bodyStart,
                    bodyEnd: index,
                };
            }
        }
    }

    return null;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getThemeFontVariableName(fontId: string): string {
    return `--font-${fontId}`;
}

function getFontThemeDeclaration(font: Font): string {
    const themeVariable = getThemeFontVariableName(font.id);
    const fontVariable = font.variable || themeVariable;

    return `${themeVariable}: var(${fontVariable});`;
}

/**
 * Adds or updates a Tailwind CSS `@theme` font token for an Onlook-managed font.
 */
export function addFontToCssTheme(font: Font, content: string): string {
    const declaration = getFontThemeDeclaration(font);
    const themeVariable = getThemeFontVariableName(font.id);

    const block = findThemeBlock(content);
    if (!block) {
        const separator = content.endsWith('\n') ? '\n' : '\n\n';
        return `${content}${separator}@theme inline {\n    ${declaration}\n}\n`;
    }

    const beforeBody = content.slice(0, block.bodyStart);
    const body = content.slice(block.bodyStart, block.bodyEnd);
    const afterBody = content.slice(block.bodyEnd);
    const escapedThemeVariable = escapeRegExp(themeVariable);
    const existingDeclarationRegex = new RegExp(`(^\\s*)${escapedThemeVariable}\\s*:[^;]+;`, 'm');

    if (existingDeclarationRegex.test(body)) {
        return `${beforeBody}${body.replace(existingDeclarationRegex, `$1${declaration}`)}${afterBody}`;
    }

    const trimmedBody = body.replace(/\s*$/, '');
    return `${beforeBody}${trimmedBody}\n    ${declaration}\n${afterBody}`;
}

/**
 * Removes a Tailwind CSS `@theme` font token for an Onlook-managed font.
 */
export function removeFontFromCssTheme(fontId: string, content: string): string {
    const block = findThemeBlock(content);
    if (!block) {
        return content;
    }

    const themeVariable = getThemeFontVariableName(fontId);
    const escapedThemeVariable = escapeRegExp(themeVariable);
    const declarationRegex = new RegExp(`\\n?\\s*${escapedThemeVariable}\\s*:[^;]+;`, 'g');
    const beforeBody = content.slice(0, block.bodyStart);
    const body = content.slice(block.bodyStart, block.bodyEnd);
    const afterBody = content.slice(block.bodyEnd);

    return `${beforeBody}${body.replace(declarationRegex, '')}${afterBody}`;
}
