import t from '@babel/types';
import { DATA_ONLOOK_ID } from "./constants";
import { compress } from "./helpers";

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

function getDataOnlookId(path: any, filename: string, root: string): string {
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
  };

  return compress(domNode);
}
