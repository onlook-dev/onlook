import type {
    CodeDiff,
    CodeDiffRequest,
    CodeGroup,
    CodeMove,
    CodeRemove,
    CodeRemoveImage,
    CodeUngroup,
    EditTextAction,
    FileToRequests,
    GroupElementsAction,
    InsertElementAction,
    InsertImageAction,
    MoveElementAction,
    RemoveElementAction,
    RemoveImageAction,
    UngroupElementsAction,
    UpdateStyleAction,
    WriteCodeAction
} from '@onlook/models';
import { CodeActionType } from '@onlook/models';
import { getAstFromContent, getContentFromAst, transformAst } from '@onlook/parser';
import { getOrCreateCodeDiffRequest } from './helpers';
import { getInsertedElement } from './insert';
import { addTailwindToRequest } from './tailwind';

export async function processGroupedRequests(groupedRequests: FileToRequests): Promise<CodeDiff[]> {
    const diffs: CodeDiff[] = [];
    for (const [path, request] of groupedRequests) {
        const { oidToRequest, content } = request;
        const ast = getAstFromContent(content);

        if (!ast) {
            throw new Error('No ast found for file');
        }

        const original = await getContentFromAst(ast, content);
        transformAst(ast, oidToRequest);
        const generated = await getContentFromAst(ast, content);
        diffs.push({ original, generated, path });
    }
    return diffs;
}

export async function getStyleRequests({ targets }: UpdateStyleAction): Promise<CodeDiffRequest[]> {
    const oidToCodeChange = new Map<string, CodeDiffRequest>();

    for (const target of targets) {
        if (!target.oid) {
            throw new Error('No oid found for style change');
        }

        const request = await getOrCreateCodeDiffRequest(target.oid, oidToCodeChange);
        addTailwindToRequest(request, target.change.updated);
    }

    return Array.from(oidToCodeChange.values());
}

export async function getInsertRequests({
    location,
    element,
    pasteParams,
    codeBlock,
}: InsertElementAction): Promise<CodeDiffRequest[]> {
    const oidToCodeChange = new Map<string, CodeDiffRequest>();
    const insertedEl = getInsertedElement(element, location, pasteParams, codeBlock);

    if (!insertedEl.location.targetOid) {
        throw new Error('No oid found for inserted element');
    }

    const request = await getOrCreateCodeDiffRequest(
        insertedEl.location.targetOid,
        oidToCodeChange,
    );
    request.structureChanges.push(insertedEl);
    return Array.from(oidToCodeChange.values());
}

export async function getRemoveRequests({
    element,
    codeBlock,
}: RemoveElementAction): Promise<CodeDiffRequest[]> {
    const oidToCodeChange = new Map<string, CodeDiffRequest>();
    const removedEl: CodeRemove = {
        oid: element.oid,
        type: CodeActionType.REMOVE,
        codeBlock,
    };

    const request = await getOrCreateCodeDiffRequest(removedEl.oid, oidToCodeChange);
    request.structureChanges.push(removedEl);
    return Array.from(oidToCodeChange.values());
}

export async function getEditTextRequests({
    targets,
    newContent,
}: EditTextAction): Promise<CodeDiffRequest[]> {
    const oidToCodeChange = new Map<string, CodeDiffRequest>();

    for (const target of targets) {
        if (!target.oid) {
            throw new Error('No oid found for text edit');
        }
        const request = await getOrCreateCodeDiffRequest(target.oid, oidToCodeChange);
        request.textContent = newContent;
    }

    return Array.from(oidToCodeChange.values());
}

export async function getMoveRequests({
    targets,
    location,
}: MoveElementAction): Promise<CodeDiffRequest[]> {
    const oidToCodeChange = new Map<string, CodeDiffRequest>();

    for (const target of targets) {
        if (!target.oid) {
            throw new Error('No oid found for move');
        }

        if (!location.targetOid) {
            throw new Error('No target oid found for moved element');
        }

        const movedEl: CodeMove = {
            oid: target.oid,
            type: CodeActionType.MOVE,
            location,
        };

        const request = await getOrCreateCodeDiffRequest(location.targetOid, oidToCodeChange);
        request.structureChanges.push(movedEl);
    }

    return Array.from(oidToCodeChange.values());
}

export async function getGroupRequests(action: GroupElementsAction): Promise<CodeDiffRequest[]> {
    if (!action.parent.oid) {
        throw new Error('No parent oid found for group');
    }
    const oidToCodeChange = new Map<string, CodeDiffRequest>();
    const groupEl: CodeGroup = {
        type: CodeActionType.GROUP,
        oid: action.parent.oid,
        container: action.container,
        children: action.children,
    };

    const request = await getOrCreateCodeDiffRequest(groupEl.oid, oidToCodeChange);
    request.structureChanges.push(groupEl);

    return Array.from(oidToCodeChange.values());
}

export async function getUngroupRequests(
    action: UngroupElementsAction,
): Promise<CodeDiffRequest[]> {
    if (!action.parent.oid) {
        throw new Error('No parent oid found for ungroup');
    }
    const oidToCodeChange = new Map<string, CodeDiffRequest>();
    const ungroupEl: CodeUngroup = {
        type: CodeActionType.UNGROUP,
        oid: action.parent.oid,
        container: action.container,
        children: action.children,
    };

    const request = await getOrCreateCodeDiffRequest(ungroupEl.oid, oidToCodeChange);
    request.structureChanges.push(ungroupEl);

    return Array.from(oidToCodeChange.values());
}

export async function getWriteCodeRequests(action: WriteCodeAction): Promise<CodeDiffRequest[]> {
    throw new Error('Not implemented');
}

export async function getInsertImageRequests(
    action: InsertImageAction,
): Promise<CodeDiffRequest[]> {
    throw new Error('Not implemented');
}

export async function getRemoveImageRequests(
    action: RemoveImageAction,
): Promise<CodeDiffRequest[]> {
    const oidToCodeChange = new Map<string, CodeDiffRequest>();
    const removeImage: CodeRemoveImage = {
        ...action,
        type: CodeActionType.REMOVE_IMAGE,
    };

    for (const target of action.targets) {
        if (!target.oid) {
            throw new Error('No oid found for removed image');
        }
        const request = await getOrCreateCodeDiffRequest(target.oid, oidToCodeChange);
        request.structureChanges.push(removeImage);
    }
    return Array.from(oidToCodeChange.values());
}
