import { twMerge } from 'tailwind-merge';
import { getCssClasses } from './helpers';
import type { ActionElement, ActionElementLocation } from '/common/models/actions';
import { CodeActionType, type CodeInsert } from '/common/models/actions/code';

export function getInsertedElement(
    actionElement: ActionElement,
    location: ActionElementLocation,
    codeBlock?: string,
): CodeInsert {
    const insertedElement: CodeInsert = {
        type: CodeActionType.INSERT,
        tagName: actionElement.tagName,
        children: [],
        attributes: { className: actionElement.attributes['className'] || '' },
        textContent: actionElement.textContent,
        location,
        codeBlock,
        uuid: actionElement.uuid,
    };

    // Update classname from style
    const newClasses = getCssClasses(insertedElement.location.targetSelector, actionElement.styles);
    insertedElement.attributes['className'] = twMerge(
        insertedElement.attributes['className'] || '',
        newClasses,
    );

    if (actionElement.children) {
        insertedElement.children = actionElement.children.map((child) =>
            getInsertedElement(child, location),
        );
    }
    return insertedElement;
}
