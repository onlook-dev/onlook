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
    },
    create(context) {
        return {
            MemberExpression(node) {
                if (node.object && node.object.type === 'MemberExpression') {
                    const sourceCode = context.getSourceCode();
                    const text = sourceCode.getText(node);

                    // Check for nested bracket notation without optional chaining
                    if (text.includes('[') && text.includes(']') && !text.includes('?.')) {
                        context.report({
                            node,
                            message:
                                'Unsafe nested object access can cause runtime crashes. Use optional chaining.',
                            fix(fixer) {
                                // Replace the unsafe access with optional chaining
                                const fixed = text.replace(/\[/g, '?.[').replace(/\]\./g, ']?.');
                                return fixer.replaceText(node, fixed);
                            },
                        });
                    }
                }
            },
        };
    },
};
