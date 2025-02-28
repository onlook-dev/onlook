/**
 * Custom ESLint rule to prevent unsafe nested object access that can cause runtime crashes
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow unsafe nested object access that can cause runtime crashes',
            category: 'Possible Errors',
            recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
            unsafeNestedAccess:
                'Unsafe nested object access can cause runtime crashes. Use optional chaining or nullish coalescing.',
        },
    },
    create(context) {
        return {
            MemberExpression(node) {
                // Check if we have a nested member expression (a.b.c)
                if (node.object && node.object.type === 'MemberExpression') {
                    // Get the source code
                    const sourceCode = context.getSourceCode();
                    const text = sourceCode.getText(node);

                    // Check if this is a nested access without optional chaining
                    if (text.includes('[') && text.includes(']') && !text.includes('?.')) {
                        // Check if this is followed by a method call or property access
                        const parent = node.parent;
                        if (
                            parent &&
                            (parent.type === 'CallExpression' || parent.type === 'MemberExpression')
                        ) {
                            context.report({
                                node,
                                messageId: 'unsafeNestedAccess',
                                fix(fixer) {
                                    // Replace the unsafe access with optional chaining
                                    // This is a simplified fix and might need adjustments
                                    const fixed = text
                                        .replace(/\[/g, '?.[')
                                        .replace(/\]\./g, ']?.');
                                    return fixer.replaceText(node, fixed);
                                },
                            });
                        }
                    }
                }
            },
        };
    },
};
