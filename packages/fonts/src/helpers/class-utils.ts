import { types as t, type t as T } from '@onlook/parser';

const FONT_WEIGHT_REGEX =
    /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/;

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
    const quasis = [
        t.templateElement({ raw: '', cooked: '' }, false),
        t.templateElement({ raw: ' ', cooked: ' ' }, false),
    ];

    if (t.isStringLiteral(originalExpr)) {
        quasis.push(
            t.templateElement(
                {
                    raw: originalExpr.value,
                    cooked: originalExpr.value,
                },
                true,
            ),
        );
        return t.templateLiteral(quasis, [fontVarExpr]);
    } else {
        quasis.push(t.templateElement({ raw: '', cooked: '' }, true));
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

        // Make sure expression is not null or undefined
        if (!classNameAttr.value.expression) {
            return false;
        }

        const expr = classNameAttr.value.expression;

        // Handle template literals
        if (t.isTemplateLiteral(expr)) {
            try {
                // Ensure quasis and expressions arrays exist
                if (!expr.quasis || !expr.expressions) {
                    return false;
                }

                // Filter out font variable expressions
                const expressionsToKeep = expr.expressions.filter((e) => {
                    if (!e) {
                        return false;
                    }

                    try {
                        if (t.isMemberExpression(e)) {
                            const obj = e.object;
                            if (!obj) {
                                return true;
                            }

                            if (options.fontIds && options.fontIds.length > 0) {
                                // Remove specific fonts
                                return !(t.isIdentifier(obj) && options.fontIds.includes(obj.name));
                            } else if (options.removeAll) {
                                // Remove all font variables except font-weight classes
                                const prop = e.property;
                                if (!prop) {
                                    return true;
                                }

                                return !(
                                    t.isIdentifier(prop) &&
                                    (prop.name === 'variable' || prop.name === 'className')
                                );
                            }
                        }
                        return true;
                    } catch (expressionError) {
                        console.error('Error processing expression:', expressionError);
                        return true;
                    }
                });

                // Get the static parts and clean them
                const staticParts = expr.quasis.map((quasi) => {
                    if (!quasi || !quasi.value) {
                        return '';
                    }
                    return quasi.value.raw || '';
                });

                let combinedStatic = staticParts.join('placeholder');

                // Remove font classes if needed
                try {
                    if (options.fontIds && options.fontIds.length > 0) {
                        // Create regex pattern to match any of the specified font IDs
                        const fontClassPattern = options.fontIds
                            .map((id) => `font-${id}\\b`)
                            .join('|');
                        const fontClassRegex = new RegExp(fontClassPattern, 'g');
                        combinedStatic = combinedStatic.replace(fontClassRegex, '');
                    } else if (options.removeAll) {
                        combinedStatic = combinedStatic.replace(/font-\w+\b/g, (match) =>
                            FONT_WEIGHT_REGEX.test(match) ? match : '',
                        );
                    }
                } catch (regexError) {
                    console.error('Error processing font class regex:', regexError);
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
                        if (!raw) {
                            console.error('Raw part is undefined');
                            continue;
                        }
                        newQuasis.push(
                            t.templateElement({ raw, cooked: raw }, i === expressionsToKeep.length),
                        );
                    }

                    expr.expressions = expressionsToKeep;
                    expr.quasis = newQuasis;
                }
                return true;
            } catch (templateError) {
                console.error('Error processing template literal:', templateError);
                return false;
            }
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
        return handleStringLiteralClassName(classNameAttr, fontVarExpr);
    } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
        return handleJSXExpressionClassName(classNameAttr, fontVarExpr, fontName);
    }
    return false;
}

/**
 * Handles updating className when it's a StringLiteral
 */
function handleStringLiteralClassName(
    classNameAttr: T.JSXAttribute,
    fontVarExpr: T.MemberExpression,
): boolean {
    if (t.isStringLiteral(classNameAttr.value)) {
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
                createTemplateLiteralWithFont(
                    fontVarExpr,
                    t.stringLiteral(classNameAttr.value.value),
                ),
            );
        }
        return true;
    }
    return false;
}

/**
 * Handles updating className when it's a JSXExpressionContainer
 */
function handleJSXExpressionClassName(
    classNameAttr: T.JSXAttribute,
    fontVarExpr: T.MemberExpression,
    fontName: string,
): boolean {
    if (t.isJSXExpressionContainer(classNameAttr.value)) {
        const expr = classNameAttr.value.expression;

        if (t.isTemplateLiteral(expr)) {
            const hasFont = expr.expressions.some(
                (e) =>
                    t.isMemberExpression(e) &&
                    t.isIdentifier(e.object) &&
                    e.object.name === fontName &&
                    t.isIdentifier(e.property) &&
                    e.property.name === 'variable',
            );

            if (!hasFont) {
                if (expr.expressions.length > 0) {
                    const lastQuasi = expr.quasis[expr.quasis.length - 1];
                    if (lastQuasi) {
                        lastQuasi.value.raw = lastQuasi.value.raw + ' ';
                        lastQuasi.value.cooked = lastQuasi.value.cooked + ' ';
                    }
                }
                expr.expressions.push(fontVarExpr);
                if (expr.quasis.length <= expr.expressions.length) {
                    expr.quasis.push(t.templateElement({ raw: '', cooked: '' }, true));
                }
                return true;
            }
        } else if (t.isIdentifier(expr) || t.isMemberExpression(expr)) {
            classNameAttr.value = t.jsxExpressionContainer(
                createTemplateLiteralWithFont(fontVarExpr, expr),
            );
            return true;
        }
    }
    return false;
}
