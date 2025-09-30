import { EditorAttributes } from '@onlook/constants';
import { createOid } from '@onlook/utility';

import { isReactFragment } from './helpers';
import type { T } from './packages';
import { t, traverse } from './packages';

/**
 * Generates a unique OID that doesn't conflict with global or local OIDs
 */
function generateUniqueOid(globalOids: Set<string>, localOids: Set<string>): string {
    let newOid: string;
    do {
        newOid = createOid();
    } while (globalOids.has(newOid) || localOids.has(newOid));
    return newOid;
}

/**
 * Creates a new JSX data-oid attribute with the given value
 */
function createOidAttribute(oidValue: string): T.JSXAttribute {
    return t.jSXAttribute(
        t.jSXIdentifier(EditorAttributes.DATA_ONLOOK_ID),
        t.stringLiteral(oidValue),
    );
}

/**
 * Removes all existing OID attributes from the element
 */
function removeAllOidAttributes(
    attributes: (T.JSXAttribute | T.JSXSpreadAttribute)[],
    indices: number[],
): void {
    // Remove in reverse order to maintain correct indices
    indices
        .sort((a, b) => b - a)
        .forEach((index) => {
            attributes.splice(index, 1);
        });
}

/**
 * Checks if an OID should be replaced due to branch or local conflicts
 */
function shouldReplaceOid(
    oidValue: string,
    globalOids: Set<string>,
    localOids: Set<string>,
    branchOidMap: Map<string, string>,
    currentBranchId?: string,
): boolean {
    const oidOwnerBranch = branchOidMap.get(oidValue);

    // Replace OID if:
    // 1. It exists globally AND belongs to a different branch, OR
    // 2. It's already used elsewhere in this same AST
    return (
        (globalOids.has(oidValue) && oidOwnerBranch && oidOwnerBranch !== currentBranchId) ||
        localOids.has(oidValue)
    );
}

/**
 * Handles elements that have multiple or invalid OIDs by removing all and creating a new one
 */
function handleProblematicOids(
    attributes: (T.JSXAttribute | T.JSXSpreadAttribute)[],
    oidIndices: number[],
    globalOids: Set<string>,
    localOids: Set<string>,
): string {
    // Remove all existing OID attributes
    removeAllOidAttributes(attributes, oidIndices);

    // Generate and add new unique OID
    const newOid = generateUniqueOid(globalOids, localOids);
    const newOidAttribute = createOidAttribute(newOid);
    attributes.push(newOidAttribute);
    localOids.add(newOid);

    return newOid;
}

/**
 * Handles elements with a single valid OID by checking for conflicts and replacing if necessary
 */
function handleSingleValidOid(
    attributes: (T.JSXAttribute | T.JSXSpreadAttribute)[],
    oidValue: string,
    oidIndex: number,
    globalOids: Set<string>,
    localOids: Set<string>,
    branchOidMap: Map<string, string>,
    currentBranchId?: string,
): { oidValue: string; wasReplaced: boolean } {
    if (shouldReplaceOid(oidValue, globalOids, localOids, branchOidMap, currentBranchId)) {
        // Generate new unique OID and replace the existing one
        const newOid = generateUniqueOid(globalOids, localOids);
        const attr = attributes[oidIndex] as T.JSXAttribute;
        attr.value = t.stringLiteral(newOid);
        localOids.add(newOid);
        return { oidValue: newOid, wasReplaced: true };
    } else {
        // Keep existing OID and track it locally
        localOids.add(oidValue);
        return { oidValue, wasReplaced: false };
    }
}

/**
 * Handles elements with no OID by creating a new one
 */
function handleMissingOid(
    attributes: (T.JSXAttribute | T.JSXSpreadAttribute)[],
    globalOids: Set<string>,
    localOids: Set<string>,
): string {
    const newOid = generateUniqueOid(globalOids, localOids);
    const newOidAttribute = createOidAttribute(newOid);
    attributes.push(newOidAttribute);
    localOids.add(newOid);
    return newOid;
}

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
                if (allOids.hasMultiple || allOids.hasInvalid) {
                    // Handle multiple or invalid OIDs: remove all and create new one
                    handleProblematicOids(attributes, allOids.indices, globalOids, localOids);
                    modified = true;
                } else {
                    // Handle single valid OID: check for conflicts
                    const oidValue = allOids.values[0];
                    const oidIndex = allOids.indices[0];

                    if (oidValue && oidIndex !== undefined) {
                        const result = handleSingleValidOid(
                            attributes,
                            oidValue,
                            oidIndex,
                            globalOids,
                            localOids,
                            branchOidMap,
                            currentBranchId,
                        );
                        if (result.wasReplaced) {
                            modified = true;
                        }
                    }
                }
            } else {
                // Handle missing OID: create new one
                handleMissingOid(attributes, globalOids, localOids);
                modified = true;
            }
        },
    });

    return { ast, modified };
}

export function getAllExistingOids(attributes: (T.JSXAttribute | T.JSXSpreadAttribute)[]): {
    indices: number[];
    values: string[];
    hasMultiple: boolean;
    hasInvalid: boolean;
} {
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
