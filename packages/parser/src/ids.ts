import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/constants';
import { createOid } from '@onlook/utility';
import { isReactFragment } from './helpers';
import { traverse } from './packages';

export function addOidsToAst(ast: t.File): { ast: t.File, modified: boolean } {
    const oids: Set<string> = new Set();
    let modified = false;

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
                    modified = true;
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
                modified = true;
            }
        },
    });
    return { ast, modified };
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

export function removeOidsFromAst(ast: t.File) {
    traverse(ast, {
        JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
            if (isReactFragment(path.node)) {
                return;
            }
            const attributes = path.node.attributes;
            const existingAttrIndex = attributes.findIndex(
                (attr: any) => attr.name?.name === EditorAttributes.DATA_ONLOOK_ID,
            );

            if (existingAttrIndex !== -1) {
                attributes.splice(existingAttrIndex, 1);
            }
        },
        JSXAttribute(path: NodePath<t.JSXAttribute>) {
            if (path.node.name.name === 'key') {
                const value = path.node.value;
                if (
                    t.isStringLiteral(value) &&
                    value.value.startsWith(EditorAttributes.ONLOOK_MOVE_KEY_PREFIX)
                ) {
                    return path.remove();
                }
            }
        },
    });
}
