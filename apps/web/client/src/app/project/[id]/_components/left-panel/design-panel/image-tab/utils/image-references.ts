import { getAstFromContent, getContentFromAst, t, traverse } from '@onlook/parser';
import path from 'path';

/**
 * Update all image references in a file from oldPath to newPath
 * Uses AST manipulation to update src attributes, className (including Tailwind), and style props
 */
export async function updateImageReferences(
    content: string,
    oldImagePath: string,
    newImagePath: string
): Promise<string> {
    const ast = getAstFromContent(content);
    if (!ast) {
        return content;
    }

    const oldFileName = path.basename(oldImagePath);
    const newFileName = path.basename(newImagePath);
    // When the caller passes a bare filename, the "full path" is identical to
    // the filename, so it must go through boundary-checked replacement to
    // avoid corrupting names that merely end with it (e.g. 'dark-logo.png').
    const oldIsBareFilename = oldImagePath === oldFileName;

    let hasChanges = false;

    traverse(ast, {
        JSXOpeningElement(nodePath) {
            const { node } = nodePath;

            for (const attr of node.attributes) {
                if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) {
                    continue;
                }

                const attrName = attr.name.name;

                // Update src attribute
                if (attrName === 'src' && t.isStringLiteral(attr.value)) {
                    const srcValue = attr.value.value;
                    if (!oldIsBareFilename && srcValue.includes(oldImagePath)) {
                        attr.value.value = srcValue.replace(oldImagePath, newImagePath);
                        hasChanges = true;
                    } else if (srcValue.includes(oldFileName)) {
                        const updated = replaceFilenameAtBoundary(srcValue, oldFileName, newFileName);
                        if (updated !== srcValue) {
                            attr.value.value = updated;
                            hasChanges = true;
                        }
                    }
                }

                // Update className (handles Tailwind and other class-based images)
                if (attrName === 'className' && t.isStringLiteral(attr.value)) {
                    const className = attr.value.value;
                    // Check if contains image filename before processing
                    if (className.includes(oldFileName) || className.includes(oldImagePath)) {
                        const updated = replaceImageInString(className, oldImagePath, newImagePath, oldFileName, newFileName);
                        if (updated !== className) {
                            attr.value.value = updated;
                            hasChanges = true;
                        }
                    }
                }

                // Update className in template literals
                if (attrName === 'className' && t.isJSXExpressionContainer(attr.value)) {
                    const expression = attr.value.expression;
                    if (t.isTemplateLiteral(expression)) {
                        for (const quasi of expression.quasis) {
                            const rawValue = quasi.value.raw;
                            if (!oldIsBareFilename && rawValue.includes(oldImagePath)) {
                                quasi.value.raw = rawValue.replace(oldImagePath, newImagePath);
                                quasi.value.cooked = quasi.value.raw;
                                hasChanges = true;
                            } else if (rawValue.includes(oldFileName)) {
                                const updated = replaceFilenameAtBoundary(rawValue, oldFileName, newFileName);
                                if (updated !== rawValue) {
                                    quasi.value.raw = updated;
                                    quasi.value.cooked = updated;
                                    hasChanges = true;
                                }
                            }
                        }
                    }
                }

                // Update style prop backgroundImage
                if (attrName === 'style' && t.isJSXExpressionContainer(attr.value)) {
                    const expression = attr.value.expression;
                    if (t.isObjectExpression(expression)) {
                        for (const prop of expression.properties) {
                            if (
                                t.isObjectProperty(prop) &&
                                t.isIdentifier(prop.key) &&
                                prop.key.name === 'backgroundImage' &&
                                t.isStringLiteral(prop.value)
                            ) {
                                const bgValue = prop.value.value;
                                if (!oldIsBareFilename && bgValue.includes(oldImagePath)) {
                                    prop.value.value = bgValue.replace(oldImagePath, newImagePath);
                                    hasChanges = true;
                                } else if (bgValue.includes(oldFileName)) {
                                    const updated = replaceFilenameAtBoundary(bgValue, oldFileName, newFileName);
                                    if (updated !== bgValue) {
                                        prop.value.value = updated;
                                        hasChanges = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
    });

    if (!hasChanges) {
        return content;
    }

    return await getContentFromAst(ast, content);
}

/**
 * Replace image paths in a string (used for className updates)
 * Handles both full paths and filenames, avoiding double replacement
 */
function replaceImageInString(
    str: string,
    oldPath: string,
    newPath: string,
    oldFilename: string,
    newFilename: string
): string {
    let result = str;

    // Replace full path first if it exists. A bare filename (oldPath ===
    // oldFilename) skips this branch so it is only matched at a path-segment
    // boundary instead of as a raw substring.
    if (oldPath !== oldFilename && result.includes(oldPath)) {
        result = result.replace(new RegExp(escapeRegExp(oldPath), 'g'), newPath);
    } else if (result.includes(oldFilename)) {
        // Only replace filename if full path wasn't found (to avoid double replacement)
        result = replaceFilenameAtBoundary(result, oldFilename, newFilename);
    }

    return result;
}

/**
 * Replace filename occurrences only when they are preceded by a path-segment
 * boundary (start of string, '/', quote, whitespace, or '('). This prevents
 * renaming 'logo.png' from also corrupting 'dark-logo.png' or 'xlogo.png',
 * while still matching legitimate references like 'logo.png', './logo.png',
 * or url(logo.png).
 */
function replaceFilenameAtBoundary(str: string, oldFilename: string, newFilename: string): string {
    const pattern = new RegExp(`(^|[\\s/'"\`(])${escapeRegExp(oldFilename)}`, 'g');
    return str.replace(pattern, (_match, boundary: string) => boundary + newFilename);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
