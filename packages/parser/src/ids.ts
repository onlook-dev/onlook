import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/constants';
import { createOid } from '@onlook/utility';
import { isReactFragment } from './helpers';
import { traverse } from './packages';

export function addOidsToAst(ast: t.File) {
    const oids: Set<string> = new Set();

    traverse(ast, {
        JSXOpeningElement(path) {
            if (isReactFragment(path.node)) {
                return;
            }
            const attributes = path.node.attributes
            const existingOid = getExistingOid(attributes)

            if (existingOid) {
                // If the element already has an oid, we need to check if it's unique
                const { value, index } = existingOid
                if (oids.has(value)) {
                    // If the oid is not unique, we need to create a new one
                    const newOid = createOid();
                    const attr = attributes[index] as t.JSXAttribute;
                    attr.value = t.stringLiteral(newOid);
                    oids.add(newOid);
                } else {
                    // If the oid is unique, we can add it to the set
                    oids.add(value);
                }
            } else {
                // If the element doesn't have an oid, we need to create one
                const newOid = createOid();
                const newOidAttribute = t.jSXAttribute(
                    t.jSXIdentifier(EditorAttributes.DATA_ONLOOK_ID),
                    t.stringLiteral(newOid),
                );
                attributes.push(newOidAttribute);
                oids.add(newOid);
            }
        },
    });
    return ast;
}

export function getExistingOid(attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[]): { value: string, index: number } | null {
    const existingAttrIndex = attributes.findIndex(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === EditorAttributes.DATA_ONLOOK_ID,
    );

    if (existingAttrIndex === -1) {
        return null;
    }

    const existingAttr = attributes[existingAttrIndex]

    if (t.isJSXSpreadAttribute(existingAttr)) {
        return null
    }

    const existingAttrValue = existingAttr.value
    if (!existingAttrValue || !t.isStringLiteral(existingAttrValue)) {
        return null
    }

    return {
        index: existingAttrIndex,
        value: existingAttrValue.value
    }
}