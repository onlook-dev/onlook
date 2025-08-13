import { types as t, type t as T } from '@onlook/parser';

const FONT_WEIGHT_REGEX =
    /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/;

type FontRemovalOptions = {
    fontIds?: string[];
    removeAll?: boolean;
};

/**
 * Helper function to find font class in a string of class names
 */
export function findFontClass(classString: string): string | null {
    if (!classString) return null;
    const fontClassMatch = /font-([a-zA-Z0-9_-]+)/.exec(classString);
    return fontClassMatch?.[1] ?? null;
}

/**
 * Filters out font-related classes from a className string, keeping only font weight classes
 */
export function filterFontClasses(className: string): string[] {
    return className.split(' ').filter((c) => !c.startsWith('font-') || c.match(FONT_WEIGHT_REGEX));
}

/**
 * Helper function to create a string literal with a font class
 */
export function createStringLiteralWithFont(
    fontClassName: string,
    originalClassName: string,
): T.StringLiteral {
    // Check if there's already a font class
    const classes = originalClassName.split(' ');
    const fontClassIndex = classes.findIndex((cls) => cls.startsWith('font-'));

    if (fontClassIndex >= 0) {
        classes[fontClassIndex] = fontClassName;
    } else {
        classes.unshift(fontClassName);
    }

    return t.stringLiteral(classes.join(' ').trim());
}

/**
 * Helper function to create a template literal that includes a font variable
 */
export function createTemplateLiteralWithFont(
    fontVarExpr: T.Expression,
    originalExpr: T.Expression,
): T.TemplateLiteral {
    if (t.isStringLiteral(originalExpr)) {
        const quasis = [
            t.templateElement({ raw: '', cooked: '' }, false),
            t.templateElement(
                {
                    raw: ' ' + originalExpr.value,
                    cooked: ' ' + originalExpr.value,
                },
                true,
            ),
        ];
        return t.templateLiteral(quasis, [fontVarExpr]);
    } else {
        const quasis = [
            t.templateElement({ raw: '', cooked: '' }, false),
            t.templateElement({ raw: ' ', cooked: ' ' }, false),
            t.templateElement({ raw: '', cooked: '' }, true),
        ];
        return t.templateLiteral(quasis, [fontVarExpr, originalExpr]);
    }
}

/**
 * Removes font variables and classes from a className attribute
 * @param classNameAttr The className attribute to modify
 * @param options Configuration options for font removal
 * @returns true if the attribute was modified
 */
export function removeFontsFromClassName(
    classNameAttr: T.JSXAttribute,
    options: {
        fontIds?: string[];
        removeAll?: boolean;
    },
): boolean {
    if (!classNameAttr || !classNameAttr.value) {
        return false;
    }

    try {
        if (t.isStringLiteral(classNameAttr.value)) {
            return removeFontFromStringLiteral(classNameAttr, options);
        }

        if (!t.isJSXExpressionContainer(classNameAttr.value)) {
            return false;
        }

        // Make sure expression is not null or undefined
        if (!classNameAttr.value.expression) {
            return false;
        }

        const expr = classNameAttr.value.expression;

        // Handle template literals
        if (t.isTemplateLiteral(expr)) {
            const result = removeFontFromTemplateLiteral(expr, options);
            // If template literal has no expressions left, convert to string literal
            if (expr.expressions.length === 0) {
                const allText = expr.quasis.map((q) => q.value.raw || '').join('');
                const cleanedText = allText.replace(/\s+/g, ' ').trim();
                classNameAttr.value = t.stringLiteral(cleanedText);
                return true;
            }
            return result;
        }

        if (t.isMemberExpression(expr)) {
            try {
                if (!expr.property || !expr.object) {
                    return false;
                }

                if (
                    t.isIdentifier(expr.property) &&
                    (expr.property.name === 'className' || expr.property.name === 'variable')
                ) {
                    if (options.fontIds && options.fontIds.length > 0) {
                        if (
                            t.isIdentifier(expr.object) &&
                            options.fontIds.includes(expr.object.name)
                        ) {
                            classNameAttr.value = t.stringLiteral('');
                            return true;
                        }
                    } else if (options.removeAll) {
                        classNameAttr.value = t.stringLiteral('');
                        return true;
                    }
                }
            } catch (memberExprError) {
                console.error('Error processing member expression:', memberExprError);
                return false;
            }
        }

        return false;
    } catch (error) {
        console.error('Error in removeFontsFromClassName:', error);
        return false;
    }
}

/**
 * Helper to update className attribute value with font variable
 */
export function updateClassNameWithFontVar(
    classNameAttr: T.JSXAttribute,
    fontName: string,
): boolean {
    const fontVarExpr = t.memberExpression(t.identifier(fontName), t.identifier('variable'));

    if (t.isStringLiteral(classNameAttr.value)) {
        return updateStringLiteralClassNameWithFont(classNameAttr, fontVarExpr);
    } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
        return updateJSXExpressionClassNameWithFont(classNameAttr, fontVarExpr, fontName);
    }
    return false;
}

/**
 * Updates className attribute with font variable when it's a StringLiteral
 */
export function updateStringLiteralClassNameWithFont(
    classNameAttr: T.JSXAttribute,
    fontVarExpr: T.MemberExpression,
): boolean {
    if (!t.isStringLiteral(classNameAttr.value)) {
        return false;
    }

    if (classNameAttr.value.value === '') {
        classNameAttr.value = t.jsxExpressionContainer(
            t.templateLiteral(
                [
                    t.templateElement({ raw: '', cooked: '' }, false),
                    t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [fontVarExpr],
            ),
        );
    } else {
        classNameAttr.value = t.jsxExpressionContainer(
            createTemplateLiteralWithFont(fontVarExpr, t.stringLiteral(classNameAttr.value.value)),
        );
    }
    return true;
}

/**
 * Updates className attribute with font variable when it's a JSXExpressionContainer
 */
export function updateJSXExpressionClassNameWithFont(
    classNameAttr: T.JSXAttribute,
    fontVarExpr: T.MemberExpression,
    fontName: string,
): boolean {
    if (!t.isJSXExpressionContainer(classNameAttr.value)) {
        return false;
    }

    const expr = classNameAttr.value.expression;

    if (t.isTemplateLiteral(expr)) {
        const isFontAlreadyPresent = expr.expressions.some(
            (e) =>
                t.isMemberExpression(e) &&
                t.isIdentifier(e.object) &&
                e.object.name === fontName &&
                t.isIdentifier(e.property) &&
                e.property.name === 'variable',
        );

        if (isFontAlreadyPresent) {
            return false;
        }

        if (expr.expressions.length > 0) {
            // Add space to the last quasi if it exists
            const lastQuasi = expr.quasis[expr.quasis.length - 1];
            if (lastQuasi) {
                lastQuasi.value.raw = lastQuasi.value.raw + ' ';
                lastQuasi.value.cooked = lastQuasi.value.cooked + ' ';
            }
        }

        expr.expressions.push(fontVarExpr);

        // Add a new quasi if there are more expressions than quasis
        if (expr.quasis.length <= expr.expressions.length) {
            expr.quasis.push(t.templateElement({ raw: '', cooked: '' }, true));
        }

        return true;
    }

    if (t.isIdentifier(expr) || t.isMemberExpression(expr)) {
        classNameAttr.value = t.jsxExpressionContainer(
            createTemplateLiteralWithFont(fontVarExpr, expr),
        );
        return true;
    }

    return false;
}

/**
 * Updates a template literal expression to prepend a font class name to the first quasi
 * @param expr The template literal expression to modify
 * @param fontClassName The font class name to prepend
 * @returns true if the expression was modified
 */
export function updateTemplateLiteralWithFontClass(
    expr: T.TemplateLiteral,
    fontClassName: string,
): boolean {
    if (!t.isTemplateLiteral(expr) || !expr.quasis || expr.quasis.length === 0) {
        return false;
    }

    const firstQuasi = expr.quasis[0];
    if (!firstQuasi) {
        return false;
    }

    const originalText = firstQuasi.value.raw || '';

    const filteredClasses = filterFontClasses(originalText.trim());
    const cleanedFilteredClasses = filteredClasses.filter((c) => c.trim() !== '');

    let newText = fontClassName;
    if (cleanedFilteredClasses.length > 0) {
        newText += ' ' + cleanedFilteredClasses.join(' ');
    }

    if (originalText.endsWith(' ') || (originalText.trim() === '' && expr.expressions.length > 0)) {
        newText += ' ';
    }

    const newFirstQuasi = t.templateElement(
        {
            raw: newText,
            cooked: newText,
        },
        firstQuasi.tail,
    );

    expr.quasis[0] = newFirstQuasi;
    return true;
}

function removeFontFromStringLiteral(
    classNameAttr: T.JSXAttribute,
    options: {
        fontIds?: string[];
        removeAll?: boolean;
    },
): boolean {
    if (!classNameAttr.value) {
        return false;
    }

    if (!t.isStringLiteral(classNameAttr.value)) {
        return false;
    }

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

function removeFontFromTemplateLiteral(
    expr: T.TemplateLiteral,
    options: {
        fontIds?: string[];
        removeAll?: boolean;
    },
): boolean {
    if (!expr.quasis || !expr.expressions) return false;

    try {
        // Filter expressions to keep (only process actual expressions, not TSTypes)
        const validExpressions = getValidExpressions(expr);
        const keptExpressions = filterExpressionsToKeep(validExpressions, options);

        if (keptExpressions.length === 0) {
            return convertToSimpleTemplate(expr, options);
        }

        // Rebuild template with kept expressions
        const newQuasis: T.TemplateElement[] = [];
        const newExpressions: T.Expression[] = [];
        let accumulatedText = '';

        const addQuasi = (quasi: T.TemplateElement | undefined): void => {
            if (quasi) {
                accumulatedText += quasi.value.raw || '';
            }
        };

        for (let i = 0; i < expr.expressions.length; i++) {
            const e = expr.expressions[i];
            const quasis = expr.quasis[i];
            if (!t.isExpression(e)) continue;

            // Add the quasi before this expression
            addQuasi(quasis);

            if (!shouldRemoveExpression(e, options)) {
                let cleanedText = cleanFontClasses(accumulatedText, options);
                if (newQuasis.length === 0) {
                    cleanedText = cleanedText.replace(/^\s+/, '');
                }
                newQuasis.push(t.templateElement({ raw: cleanedText, cooked: cleanedText }, false));
                newExpressions.push(e);
                accumulatedText = '';
            }
        }

        if (expr.quasis.length > expr.expressions.length) {
            const finalQuasi = expr.quasis[expr.quasis.length - 1];
            addQuasi(finalQuasi);
        }

        let finalText = cleanFontClasses(accumulatedText, options);
        finalText = finalText.replace(/\s+$/, '');
        newQuasis.push(t.templateElement({ raw: finalText, cooked: finalText }, true));

        expr.expressions = newExpressions;
        expr.quasis = newQuasis;
        return true;
    } catch (error) {
        console.error('Error processing template literal:', error);
        return false;
    }
}

function cleanFontClasses(
    text: string,
    options: {
        fontIds?: string[];
        removeAll?: boolean;
    },
): string {
    if (options.fontIds?.length) {
        return cleanSpecificFontClasses(text, options.fontIds);
    }

    if (options.removeAll) {
        return cleanAllFontClasses(text);
    }

    return text;
}

function cleanSpecificFontClasses(text: string, fontIds: string[]): string {
    const pattern = fontIds.map((id) => `font-${id}\\b`).join('|');
    return text.replace(new RegExp(pattern, 'g'), '');
}

function cleanAllFontClasses(text: string): string {
    return text.replace(/font-\w+\b/g, (match) => (FONT_WEIGHT_REGEX.test(match) ? match : ''));
}

function filterExpressionsToKeep(
    expressions: T.Expression[],
    options: FontRemovalOptions,
): T.Expression[] {
    return expressions.filter((expr) => !shouldRemoveExpression(expr, options));
}

function shouldRemoveExpression(e: T.Expression, options: FontRemovalOptions): boolean {
    if (!t.isMemberExpression(e) || !e.object) return false;

    if (options.fontIds?.length) {
        return t.isIdentifier(e.object) && options.fontIds.includes(e.object.name);
    }

    if (options.removeAll && e.property) {
        return t.isIdentifier(e.property) && ['variable', 'className'].includes(e.property.name);
    }

    return false;
}

function getValidExpressions(expr: T.TemplateLiteral): T.Expression[] {
    return expr.expressions.filter((e): e is T.Expression => t.isExpression(e));
}

function convertToSimpleTemplate(expr: T.TemplateLiteral, options: FontRemovalOptions): boolean {
    const allText = expr.quasis.map((q) => q.value.raw || '').join('');
    const cleanedText = cleanFontClasses(allText, options).replace(/\s+/g, ' ').trim();

    expr.quasis = [t.templateElement({ raw: cleanedText, cooked: cleanedText }, true)];
    expr.expressions = [];
    return true;
}
