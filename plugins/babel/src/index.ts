import t, { type JSXOpeningElement } from '@babel/types';
import { DATA_ONLOOK_ID } from "./constants";
import { compress } from './helpers';

let idStack: object[] = [];

export default function babelPluginOnlook({ root = process.cwd() }): any {
  return {
    visitor: {
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

        const attributeValue = getDataOnlookId(path, filename, root);
        idStack.push(attributeValue);

        if (!isCustomComponent(path.node.openingElement)) {
          // Create the custom attribute
          const value = compress(idStack);
          const onlookAttribute = t.jSXAttribute(
            t.jSXIdentifier(DATA_ONLOOK_ID),
            t.stringLiteral(value)
          );

          // Append the attribute to the element
          path.node.openingElement.attributes.push(onlookAttribute);
          idStack = [];
        }
      }
    },
  };
}

function isCustomComponent(element: JSXOpeningElement): boolean {
  // @ts-expect-error
  if (!element.name || !element.name.type || !element.name.name) {
    return false;
  }
  const elementName = element.name;

  // Handle namespaced components
  if (elementName.type === 'JSXMemberExpression') {
    return true;
  }

  // Handle regular components
  if (elementName.type === 'JSXIdentifier') {
    const name = elementName.name;
    return name[0] === name[0].toUpperCase();
  }
  return false;
}

function getDataOnlookId(path: any, filename: string, root: string): object {
  const startTag = {
    start: {
      line: path.node.openingElement.loc.start.line,
      column: path.node.openingElement.loc.start.column + 1
    },
    end: {
      line: path.node.openingElement.loc.end.line,
      column: path.node.openingElement.loc.end.column + 1
    }
  };
  const endTag = path.node.closingElement ? {
    start: {
      line: path.node.closingElement.loc.start.line,
      column: path.node.closingElement.loc.start.column + 1
    },
    end: {
      line: path.node.closingElement.loc.end.line,
      column: path.node.closingElement.loc.end.column + 1
    }
  } : null;

  const domNode = {
    path: filename,
    startTag,
    endTag,
    name: path.node.openingElement.name.name,
  };
  return domNode;
}
