
import generate from "@babel/generator";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import t from "@babel/types";
import { twMerge } from "tailwind-merge";
import { readBlock } from "./files";
import { CodeResult, WriteStyleParams } from "/common/models";

export async function writeStyle(params: WriteStyleParams[]): Promise<CodeResult[]> {
    const codeResults: CodeResult[] = []
    for (const param of params) {
        const code = (await readBlock(param.templateNode))
        const ast = parseJsx(code);
        const original = generate(ast).code;
        addClassToAst(ast, param.tailwind);

        const generated = generate(ast).code;
        const res: CodeResult = { original, generated, param }
        codeResults.push(res);
    }
    return codeResults;
}

function parseJsx(code: string) {
    return parse(code, {
        plugins: ['typescript', 'jsx']
    })
}

function addClassToAst(ast: t.File, className: string) {
    let processed = false
    traverse(ast, {
        JSXOpeningElement(path) {
            if (processed) return;
            let classNameAttr = null;

            // Check for existing className attribute
            path.node.attributes.forEach(attribute => {
                if (t.isJSXAttribute(attribute) && attribute.name.name === "className") {
                    classNameAttr = attribute;

                    // Handle className that is a simple string
                    if (t.isStringLiteral(attribute.value)) {
                        attribute.value.value = twMerge(attribute.value.value, className)
                    }

                    // Handle className that is an expression (e.g., cn("class1", className))
                    else if (t.isJSXExpressionContainer(attribute.value) && t.isCallExpression(attribute.value.expression)) {
                        attribute.value.expression.arguments.push(t.stringLiteral(className));
                    }
                }
            });

            // If no className attribute found, add one
            if (!classNameAttr) {
                const newClassNameAttr = t.jsxAttribute(
                    t.jsxIdentifier("className"),
                    t.stringLiteral(className)
                );
                path.node.attributes.push(newClassNameAttr);
            }
            processed = true;
        }
    });
}