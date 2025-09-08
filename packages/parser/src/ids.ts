import { EditorAttributes } from '@onlook/constants';
import { createOid } from '@onlook/utility';
import { isReactFragment } from './helpers';
import { type NodePath, type t as T, types as t, traverse } from './packages';

export function addOidsToAst(
    ast: T.File,
    globalOids: Set<string> = new Set(),
    branchOidMap: Map<string, string> = new Map(),
    currentBranchId?: string,
): { ast: T.File; modified: boolean } {
    let modified = false;
    // Track OIDs used within this AST to prevent duplicates in the same file
    const localOids = new Set<string>();

    traverse(ast, {
        JSXOpeningElement(path) {
            if (isReactFragment(path.node)) {
                return;
            }
            const attributes = path.node.attributes;
            const existingOid = getExistingOid(attributes);

            if (existingOid) {
                // If the element already has an oid, check if it conflicts with other branches or local duplicates
                const { value, index } = existingOid;
                const oidOwnerBranch = branchOidMap.get(value);

                // Replace OID if:
                // 1. It exists globally AND belongs to a different branch, OR
                // 2. It's already used elsewhere in this same AST
                if (
                    (globalOids.has(value) &&
                        oidOwnerBranch &&
                        oidOwnerBranch !== currentBranchId) ||
                    localOids.has(value)
                ) {
                    // Generate a new unique OID that doesn't conflict globally or locally
                    let newOid: string;
                    do {
                        newOid = createOid();
                    } while (globalOids.has(newOid) || localOids.has(newOid));

                    const attr = attributes[index] as T.JSXAttribute;
                    attr.value = t.stringLiteral(newOid);
                    localOids.add(newOid);
                    modified = true;
                } else {
                    // Keep existing OID and track it locally for future duplicate detection
                    localOids.add(value);
                }
            } else {
                // If the element doesn't have an oid, create one
                let newOid: string;
                do {
                    newOid = createOid();
                } while (globalOids.has(newOid) || localOids.has(newOid));

                const newOidAttribute = t.jSXAttribute(
                    t.jSXIdentifier(EditorAttributes.DATA_ONLOOK_ID),
                    t.stringLiteral(newOid),
                );
                attributes.push(newOidAttribute);
                localOids.add(newOid);
                modified = true;
            }
        },
    });
    return { ast, modified };
}

export function getExistingOid(
    attributes: (T.JSXAttribute | T.JSXSpreadAttribute)[],
): { value: string; index: number } | null {
    const existingAttrIndex = attributes.findIndex(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === EditorAttributes.DATA_ONLOOK_ID,
    );

    if (existingAttrIndex === -1) {
        return null;
    }

    const existingAttr = attributes[existingAttrIndex];

    if (t.isJSXSpreadAttribute(existingAttr)) {
        return null;
    }

    if (!existingAttr) {
        return null;
    }

    const existingAttrValue = existingAttr.value;
    if (!existingAttrValue || !t.isStringLiteral(existingAttrValue)) {
        return null;
    }

    return {
        index: existingAttrIndex,
        value: existingAttrValue.value,
    };
}

export function removeOidsFromAst(ast: T.File) {
    traverse(ast, {
        JSXOpeningElement(path: NodePath<T.JSXOpeningElement>) {
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
        JSXAttribute(path: NodePath<T.JSXAttribute>) {
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
