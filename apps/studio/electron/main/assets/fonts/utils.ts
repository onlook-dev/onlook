import * as t from '@babel/types';
import { FONT_WEIGHT_REGEX } from './types';

/**
 * Extracts the font family class from a className string, excluding font weight classes
 */
export function findFontClass(className: string): string | null {
    const fontClass = className
        .split(' ')
        .find((c) => c.startsWith('font-') && !c.match(FONT_WEIGHT_REGEX));
    return fontClass ? fontClass.replace('font-', '') : null;
}

/**
 * Filters out font-related classes from a className string, keeping only font weight classes
 */
export function filterFontClasses(className: string): string[] {
    return className.split(' ').filter((c) => !c.startsWith('font-') || c.match(FONT_WEIGHT_REGEX));
}

/**
 * Creates a template literal expression that combines a font variable with existing classes
 */
export function createTemplateLiteralWithFont(
    fontVarExpr: t.Expression,
    existingValue?: t.Expression,
): t.TemplateLiteral {
    const quasis = [
        t.templateElement({ raw: '', cooked: '' }, false),
        t.templateElement({ raw: ' ', cooked: ' ' }, false),
        t.templateElement({ raw: '', cooked: '' }, true),
    ];
    const expressions = existingValue ? [fontVarExpr, existingValue] : [fontVarExpr];
    return t.templateLiteral(quasis, expressions);
}

/**
 * Creates a string literal that combines a font class with existing classes
 */
export function createStringLiteralWithFont(
    fontClassName: string,
    existingClasses: string,
): t.StringLiteral {
    const classes = filterFontClasses(existingClasses);
    classes.unshift(fontClassName);
    return t.stringLiteral(classes.join(' '));
}

/**
 * Removes font variables and classes from a className attribute
 * @param classNameAttr The className attribute to modify
 * @param options Configuration options for font removal
 * @returns true if the attribute was modified
 */
export function removeFontsFromClassName(
    classNameAttr: t.JSXAttribute,
    options: {
        fontIds?: string[];
        removeAll?: boolean;
    },
): boolean {
    if (t.isStringLiteral(classNameAttr.value)) {
        const value = classNameAttr.value.value;
        let classes: string[];

        if (options.fontIds && options.fontIds.length > 0) {
            // Remove only specific font classes
            const fontClassPatterns = options.fontIds.map((id) => `font-${id}\\b`).join('|');
            const fontClassRegex = new RegExp(fontClassPatterns, 'g');
            classes = value.split(' ').filter((c) => !fontClassRegex.test(c));
        } else if (options.removeAll) {
            // Remove all font classes
            classes = filterFontClasses(value);
        } else {
            // No removal requested
            return false;
        }

        classNameAttr.value = t.stringLiteral(classes.join(' '));
        return true;
    }

    if (!t.isJSXExpressionContainer(classNameAttr.value)) {
        return false;
    }

    const expr = classNameAttr.value.expression;

    // Handle template literals
    if (t.isTemplateLiteral(expr)) {
        // Filter out font variable expressions
        const expressionsToKeep = expr.expressions.filter((e) => {
            if (t.isMemberExpression(e)) {
                const obj = e.object;
                if (options.fontIds && options.fontIds.length > 0) {
                    // Remove specific fonts
                    return !(t.isIdentifier(obj) && options.fontIds.includes(obj.name));
                } else if (options.removeAll) {
                    // Remove all font variables except font-weight classes
                    const prop = e.property;
                    return !(
                        t.isIdentifier(prop) &&
                        (prop.name === 'variable' || prop.name === 'className')
                    );
                }
            }
            return true;
        });

        // Get the static parts and clean them
        const staticParts = expr.quasis.map((quasi) => quasi.value.raw);
        let combinedStatic = staticParts.join('placeholder');

        // Remove font classes if needed
        if (options.fontIds && options.fontIds.length > 0) {
            // Create regex pattern to match any of the specified font IDs
            const fontClassPattern = options.fontIds.map((id) => `font-${id}\\b`).join('|');
            const fontClassRegex = new RegExp(fontClassPattern, 'g');
            combinedStatic = combinedStatic.replace(fontClassRegex, '');
        } else if (options.removeAll) {
            combinedStatic = combinedStatic.replace(/font-\w+\b/g, (match) =>
                FONT_WEIGHT_REGEX.test(match) ? match : '',
            );
        }

        // Split back into parts with placeholders
        const cleanedParts = combinedStatic.split('placeholder');

        if (expressionsToKeep.length === 0) {
            // If no expressions left, convert to string literal
            classNameAttr.value = t.stringLiteral(
                cleanedParts.join('').replace(/\s+/g, ' ').trim(),
            );
        } else {
            // Rebuild template literal with remaining expressions
            const newQuasis = [];

            for (let i = 0; i <= expressionsToKeep.length; i++) {
                const raw = i < cleanedParts.length ? cleanedParts[i] : '';
                newQuasis.push(
                    t.templateElement({ raw, cooked: raw }, i === expressionsToKeep.length),
                );
            }

            expr.expressions = expressionsToKeep;
            expr.quasis = newQuasis;
        }
        return true;
    }

    if (
        t.isMemberExpression(expr) &&
        t.isIdentifier(expr.property) &&
        (expr.property.name === 'className' || expr.property.name === 'variable')
    ) {
        if (options.fontIds && options.fontIds.length > 0) {
            if (t.isIdentifier(expr.object) && options.fontIds.includes(expr.object.name)) {
                classNameAttr.value = t.stringLiteral('');
                return true;
            }
        } else if (options.removeAll) {
            classNameAttr.value = t.stringLiteral('');
            return true;
        }
    }

    return false;
}
