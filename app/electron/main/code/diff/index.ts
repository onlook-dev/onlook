import generate from '@babel/generator';
import * as t from '@babel/types';
import { readFile } from '../files';
import { parseJsx, removeSemiColonIfApplicable } from '../helpers';
import { addClassToAst } from './class';
import { insertElementToAst } from './insert';
import { CodeDiff, CodeDiffRequest } from '/common/models/code';
import { DomActionElement, DomActionType, InsertedElement } from '/common/models/element/domAction';

interface RequestsByPath {
    requests: CodeDiffRequest[];
    codeBlock: string;
}

export async function getCodeDiffs(requests: CodeDiffRequest[]): Promise<CodeDiff[]> {
    const groupedRequests = await groupRequestsByTemplatePath(requests);
    return processGroupedRequests(groupedRequests);
}

async function groupRequestsByTemplatePath(
    requests: CodeDiffRequest[],
): Promise<Record<string, RequestsByPath>> {
    const groupedRequests: Record<string, RequestsByPath> = {};
    for (const request of requests) {
        const path = request.templateNode.path;
        if (!groupedRequests[path]) {
            const codeBlock: string = await readFile(path);
            groupedRequests[path] = { requests: [], codeBlock };
        }
        groupedRequests[path].requests.push(request);
    }
    return groupedRequests;
}

function processGroupedRequests(groupedRequests: Record<string, RequestsByPath>): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    const generateOptions = { retainLines: true, compact: false };

    for (const path in groupedRequests) {
        const { requests, codeBlock } = groupedRequests[path];
        const ast = parseJsx(codeBlock);
        if (!ast) {
            continue;
        }

        const original = generateCode(ast, generateOptions, codeBlock);
        applyModificationsToAst(ast, requests);
        const generated = generateCode(ast, generateOptions, codeBlock);

        diffs.push({ original, generated, templateNode: requests[0].templateNode });
    }

    return diffs;
}

function generateCode(ast: t.File, options: any, codeBlock: string): string {
    return removeSemiColonIfApplicable(generate(ast, options, codeBlock).code, codeBlock);
}

function applyModificationsToAst(ast: t.File, requests: CodeDiffRequest[]): void {
    for (const request of requests) {
        if (request.attributes.className) {
            addClassToAst(ast, request.attributes.className);
        }

        const structureChangeElements = getStructureChangeElements(request);
        applyStructureChanges(ast, structureChangeElements);
    }
}

function getStructureChangeElements(request: CodeDiffRequest): DomActionElement[] {
    return [...request.insertedElements, ...request.movedElements].sort(
        (a, b) => a.timestamp - b.timestamp,
    );
}

function applyStructureChanges(ast: t.File, elements: DomActionElement[]): void {
    for (const element of elements) {
        if (element.type === DomActionType.MOVE) {
            // moveElementInAst(ast, element as MovedElementWithTemplate, request);
        } else if (element.type === DomActionType.INSERT) {
            insertElementToAst(ast, element as InsertedElement);
        }
    }
}
