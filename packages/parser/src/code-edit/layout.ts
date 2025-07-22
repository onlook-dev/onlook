import {
    DEPRECATED_PRELOAD_SCRIPTS,
    PRELOAD_SCRIPT_FILE_NAME,
    PRELOAD_SCRIPT_ID,
} from '@onlook/constants';
import { type t as T, types as t, traverse } from '../packages';

export const injectPreloadScript = (ast: T.File): { ast: T.File; modified: boolean } => {
    let modified = false;
    const hasScriptImport = isScriptImported(ast);
    if (!hasScriptImport) {
        addScriptImport(ast);
        modified = true;
    }

    modified = removeDeprecatedPreloadScripts(ast) || modified;

    let scriptInjected = false;
    let htmlFound = false;

    traverse(ast, {
        JSXElement(path) {
            const name = path.node.openingElement.name;
            if (!t.isJSXIdentifier(name)) return;

            if (name.name === 'html') {
                htmlFound = true;
                normalizeSelfClosingTag(path.node);
            }

            if (name.name === 'body') {
                normalizeSelfClosingTag(path.node);
                if (!scriptInjected) {
                    addScriptToJSXElement(path.node);
                    scriptInjected = true;
                    modified = true;
                }
            }
        },
    });

    if (!scriptInjected && htmlFound) {
        traverse(ast, {
            JSXElement(path) {
                if (t.isJSXIdentifier(path.node.openingElement.name, { name: 'html' })) {
                    createBodyTag(path.node);
                    scriptInjected = true;
                    modified = true;
                    path.stop();
                }
            },
        });
    }

    if (!scriptInjected && !htmlFound) {
        wrapWithHtmlAndBody(ast);
        modified = true;
    }

    return { ast, modified };
};

function normalizeSelfClosingTag(node: T.JSXElement): void {
    if (node.openingElement.selfClosing) {
        node.openingElement.selfClosing = false;

        if (t.isJSXIdentifier(node.openingElement.name)) {
            node.closingElement = t.jsxClosingElement(
                t.jsxIdentifier(node.openingElement.name.name),
            );
        } else {
            node.closingElement = t.jsxClosingElement(node.openingElement.name);
        }

        node.children = [];
    }
}

function isScriptImported(ast: T.File): boolean {
    let found = false;
    traverse(ast, {
        ImportDeclaration(path) {
            if (
                t.isStringLiteral(path.node.source, { value: 'next/script' }) &&
                path.node.specifiers.some(
                    (s) =>
                        t.isImportDefaultSpecifier(s) &&
                        t.isIdentifier(s.local, { name: 'Script' }),
                )
            ) {
                found = true;
                path.stop();
            }
        },
    });
    return found;
}

function addScriptImport(ast: T.File): void {
    const scriptImport = t.importDeclaration(
        [t.importDefaultSpecifier(t.identifier('Script'))],
        t.stringLiteral('next/script'),
    );

    let insertIndex = 0;
    for (let i = 0; i < ast.program.body.length; i++) {
        if (t.isImportDeclaration(ast.program.body[i])) insertIndex = i + 1;
        else break;
    }

    ast.program.body.splice(insertIndex, 0, scriptImport);
}

function getPreloadScript(): T.JSXElement {
    return t.jsxElement(
        t.jsxOpeningElement(
            t.jsxIdentifier('Script'),
            [
                t.jsxAttribute(
                    t.jsxIdentifier('src'),
                    t.stringLiteral(`/${PRELOAD_SCRIPT_FILE_NAME}`),
                ),
                t.jsxAttribute(t.jsxIdentifier('strategy'), t.stringLiteral('beforeInteractive')),
                t.jsxAttribute(t.jsxIdentifier('type'), t.stringLiteral('module')),
                t.jsxAttribute(t.jsxIdentifier('id'), t.stringLiteral(PRELOAD_SCRIPT_ID)),
            ],
            false,
        ),
        t.jsxClosingElement(t.jsxIdentifier('Script')),
        [],
        false,
    );
}

function addScriptToJSXElement(node: T.JSXElement): void {
    const alreadyInjected = node.children.some(
        (child) =>
            t.isJSXElement(child) &&
            t.isJSXIdentifier(child.openingElement.name, { name: 'Script' }) &&
            child.openingElement.attributes.some(
                (attr) =>
                    t.isJSXAttribute(attr) &&
                    t.isJSXIdentifier(attr.name, { name: 'src' }) &&
                    t.isStringLiteral(attr.value, { value: PRELOAD_SCRIPT_FILE_NAME }),
            ),
    );
    if (!alreadyInjected) {
        node.children.push(t.jsxText('\n'));
        node.children.push(getPreloadScript());
        node.children.push(t.jsxText('\n'));
    }
}

function createBodyTag(htmlElement: T.JSXElement): void {
    const body = t.jsxElement(
        t.jsxOpeningElement(t.jsxIdentifier('body'), []),
        t.jsxClosingElement(t.jsxIdentifier('body')),
        [getPreloadScript()],
        false,
    );
    htmlElement.children.push(t.jsxText('\n'), body, t.jsxText('\n'));
}

function wrapWithHtmlAndBody(ast: T.File): void {
    let hasWrapped = false;
    let hasComplexLogic = false;

    // First pass: detect if this is a complex component with hooks, state, or conditionals
    traverse(ast, {
        CallExpression(path) {
            // Check for React hooks or complex function calls
            if (
                t.isIdentifier(path.node.callee) &&
                (path.node.callee.name.startsWith('use') ||
                    [
                        'useState',
                        'useEffect',
                        'useContext',
                        'useReducer',
                        'useMemo',
                        'useCallback',
                    ].includes(path.node.callee.name))
            ) {
                hasComplexLogic = true;
            }
        },
        IfStatement(path) {
            hasComplexLogic = true;
        },
        VariableDeclarator(path) {
            // If there are variable declarations inside the component, it's complex
            hasComplexLogic = true;
        },
    });

    // If this component has complex logic, don't wrap anything - just add the script import
    if (hasComplexLogic) {
        return;
    }

    // Only wrap very simple components without any logic
    traverse(ast, {
        ArrowFunctionExpression(path) {
            if (hasWrapped) return;

            const { body } = path.node;
            // Only wrap simple arrow functions that directly return JSX
            if (t.isJSXElement(body) || t.isJSXFragment(body)) {
                const children: Array<
                    T.JSXElement | T.JSXFragment | T.JSXText | T.JSXExpressionContainer
                > = [getPreloadScript(), t.jsxText('\n'), body];

                const newBody = t.jsxElement(
                    t.jsxOpeningElement(t.jsxIdentifier('body'), []),
                    t.jsxClosingElement(t.jsxIdentifier('body')),
                    children,
                    false,
                );

                const html = t.jsxElement(
                    t.jsxOpeningElement(t.jsxIdentifier('html'), [
                        t.jsxAttribute(t.jsxIdentifier('lang'), t.stringLiteral('en')),
                    ]),
                    t.jsxClosingElement(t.jsxIdentifier('html')),
                    [newBody],
                    false,
                );

                path.node.body = t.blockStatement([t.returnStatement(html)]);
                hasWrapped = true;
                path.stop();
            }
        },
        ReturnStatement(path) {
            if (hasWrapped) return;

            // Skip early returns - they are inside if/conditional blocks
            const isInsideConditional = path.findParent(
                (parent) =>
                    t.isIfStatement(parent) ||
                    t.isConditionalExpression(parent) ||
                    t.isLogicalExpression(parent),
            );
            if (isInsideConditional) return;

            const arg = path.node.argument;
            if (!arg) return;

            // Only wrap simple JSX returns
            if (t.isJSXElement(arg) || t.isJSXFragment(arg)) {
                const children: Array<
                    T.JSXElement | T.JSXFragment | T.JSXText | T.JSXExpressionContainer
                > = [getPreloadScript(), t.jsxText('\n'), arg];

                const body = t.jsxElement(
                    t.jsxOpeningElement(t.jsxIdentifier('body'), []),
                    t.jsxClosingElement(t.jsxIdentifier('body')),
                    children,
                    false,
                );

                const html = t.jsxElement(
                    t.jsxOpeningElement(t.jsxIdentifier('html'), [
                        t.jsxAttribute(t.jsxIdentifier('lang'), t.stringLiteral('en')),
                    ]),
                    t.jsxClosingElement(t.jsxIdentifier('html')),
                    [body],
                    false,
                );

                path.node.argument = html;
                hasWrapped = true;
                path.stop();
            }
        },
    });
}

function removeDeprecatedPreloadScripts(ast: T.File): boolean {
    let modified = false;
    traverse(ast, {
        JSXElement(path) {
            const isScript = t.isJSXIdentifier(path.node.openingElement.name, { name: 'Script' });
            if (!isScript) return;

            const srcAttr = path.node.openingElement.attributes.find(
                (attr) =>
                    t.isJSXAttribute(attr) &&
                    t.isJSXIdentifier(attr.name, { name: 'src' }) &&
                    t.isStringLiteral(attr.value),
            ) as T.JSXAttribute | undefined;

            const src = srcAttr?.value;
            if (
                src &&
                t.isStringLiteral(src) &&
                DEPRECATED_PRELOAD_SCRIPTS.some((script) => src.value.includes(script))
            ) {
                modified = true;
                path.remove();
            }
        },
    });
    return modified;
}
