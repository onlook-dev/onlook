import { EditorAttributes } from '@onlook/constants';
import { createOid } from '@onlook/utility';

import { isReactFragment } from './helpers';
import { t, traverse, type T } from './packages';

export function addOidsToAst(
    ast: T.File,
    globalOids = new Set<string>(),
    branchOidMap = new Map<string, string>(),
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
            const allOids = getAllExistingOids(attributes);

            if (allOids.indices.length > 0) {
                // If there are multiple oids or any invalid oids, remove all and create a new one
                if (allOids.hasMultiple || allOids.hasInvalid) {
                    // Remove all oid attributes (in reverse order to maintain indices)
                    allOids.indices.sort((a, b) => b - a).forEach(index => {
                        attributes.splice(index, 1);
                    });

                    // Create a new unique OID
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
                } else {
                    // Single valid oid - check if it conflicts with other branches or local duplicates
                    const value = allOids.values[0];
                    const index = allOids.indices[0];

                    if (value && index !== undefined) {
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
                    }
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

export function getAllExistingOids(
    attributes: (T.JSXAttribute | T.JSXSpreadAttribute)[],
): { indices: number[]; values: string[]; hasMultiple: boolean; hasInvalid: boolean } {
    const oidIndices: number[] = [];
    const oidValues: string[] = [];
    let hasInvalid = false;

    attributes.forEach((attr, index) => {
        if (t.isJSXAttribute(attr) && attr.name.name === EditorAttributes.DATA_ONLOOK_ID) {
            oidIndices.push(index);

            const existingAttrValue = attr.value;
            if (!existingAttrValue || !t.isStringLiteral(existingAttrValue)) {
                hasInvalid = true;
                oidValues.push('');
            } else {
                const value = existingAttrValue.value;
                // Treat empty strings and whitespace-only strings as invalid
                if (!value || value.trim() === '') {
                    hasInvalid = true;
                    oidValues.push('');
                } else {
                    oidValues.push(value);
                }
            }
        }
    });

    return {
        indices: oidIndices,
        values: oidValues,
        hasMultiple: oidIndices.length > 1,
        hasInvalid,
    };
}

export function getExistingOid(
    attributes: (T.JSXAttribute | T.JSXSpreadAttribute)[],
): { value: string; index: number; shouldRemove: boolean } | null {
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
        // Mark invalid oid attributes for removal
        return {
            index: existingAttrIndex,
            value: '',
            shouldRemove: true,
        };
    }

    const value = existingAttrValue.value;
    // Treat empty strings and whitespace-only strings as invalid
    if (!value || value.trim() === '') {
        return {
            index: existingAttrIndex,
            value: '',
            shouldRemove: true,
        };
    }

    return {
        index: existingAttrIndex,
        value,
        shouldRemove: false,
    };
}
