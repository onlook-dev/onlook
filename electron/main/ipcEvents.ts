import generate from "@babel/generator";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import t from "@babel/types";
import { ipcMain } from "electron";
import { readBlock } from "./files";
import { MainChannels } from "/common/constants";

export function listenForIpcMessages(webviewPreload: string) {
    ipcMain.handle(MainChannels.WEBVIEW_PRELOAD_PATH, () => {
        return webviewPreload
    })

    ipcMain.handle(MainChannels.OPEN_CODE_BLOCK, async (e: Electron.IpcMainInvokeEvent, args) => {
        // openInVsCode(args)
        const code = (await readBlock(args))
        const ast = parse(code, {
            plugins: ['typescript', 'jsx']
        });

        addClassToAst(ast)

        const output = generate(ast, {
            compact: false,
            minified: false,
            retainLines: true,
            retainFunctionParens: true
        }, code)

        console.log("Before: ")
        console.log(code)
        console.log("After: ")
        console.log(output.code)
    })
}

function addClassToAst(ast: t.File) {
    traverse(ast, {
        JSXOpeningElement(path) {
            let classNameAttr = null;

            // Check for existing className attribute
            path.node.attributes.forEach(attribute => {
                if (t.isJSXAttribute(attribute) && attribute.name.name === "className") {
                    classNameAttr = attribute;
                    // Handle className that is a simple string
                    if (t.isStringLiteral(attribute.value)) {
                        attribute.value.value += " hello";  // Append class
                    }
                    // Handle className that is an expression (e.g., cn("class1", className))
                    else if (t.isJSXExpressionContainer(attribute.value) && t.isCallExpression(attribute.value.expression)) {
                        attribute.value.expression.arguments.push(t.stringLiteral("hello"));
                    }
                }
            });

            // If no className attribute found, add one
            if (!classNameAttr) {
                const newClassNameAttr = t.jsxAttribute(
                    t.jsxIdentifier("className"),
                    t.stringLiteral("hello")
                );
                path.node.attributes.push(newClassNameAttr);
            }
        }
    });
}