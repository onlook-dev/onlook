import t from '@babel/types';
import { DATA_ONLOOK_ID } from "./constants";
import { compress } from "./helpers";
import type { TemplateNode, TemplateTag } from './model';

export default function babelPluginOnlook({ root = process.cwd() }): any {
  const componentStack: string[] = [];
  return {
    visitor: {
      FunctionDeclaration: {
        enter(path: any) {
          const componentName = path.node.id.name;
          componentStack.push(componentName);
        },
        exit(path: any) {
          componentStack.pop();
        },
      },
      ClassDeclaration: {
        enter(path: any) {
          const componentName = path.node.id.name;
          componentStack.push(componentName);
        },
        exit(path: any) {
          componentStack.pop();
        },
      },
      VariableDeclaration: {
        enter(path: any) {
          const componentName = path.node.declarations[0].id.name;
          componentStack.push(componentName);
        },
        exit(path: any) {
          componentStack.pop();
        },
      },
      JSXElement(path: any, state: any) {
        const filename = state.file.opts.filename;
        const nodeModulesPath = `${root}/node_modules`;

        // Ignore node_modules
        if (filename.startsWith(nodeModulesPath)) {
          return;
        }

        // Ensure `loc` exists before accessing its properties
        if (!path.node.openingElement.loc || !path.node.openingElement.loc.start || !path.node.openingElement.loc.end) {
          return;
        }

        const attributeValue = getTemplateNode(path, filename, componentStack);

        // Create the custom attribute
        const onlookAttribute = t.jSXAttribute(
          t.jSXIdentifier(DATA_ONLOOK_ID),
          t.stringLiteral(attributeValue)
        );

        // Append the attribute to the element
        path.node.openingElement.attributes.push(onlookAttribute);
      }
    },
  };
}

function getTemplateNode(path: any, filename: string, componentStack: string[]): string {
  const startTag: TemplateTag = {
    start: {
      line: path.node.openingElement.loc.start.line,
      column: path.node.openingElement.loc.start.column + 1
    },
    end: {
      line: path.node.openingElement.loc.end.line,
      column: path.node.openingElement.loc.end.column + 1
    }
  };
  const endTag: TemplateTag | undefined = path.node.closingElement ? {
    start: {
      line: path.node.closingElement.loc.start.line,
      column: path.node.closingElement.loc.start.column + 1
    },
    end: {
      line: path.node.closingElement.loc.end.line,
      column: path.node.closingElement.loc.end.column + 1
    }
  } : undefined;

  const componentName = componentStack.length > 0 ? componentStack[componentStack.length - 1] : undefined;
  const domNode: TemplateNode = {
    path: filename,
    startTag,
    endTag,
    component: componentName
  };
  return compress(domNode);
}
