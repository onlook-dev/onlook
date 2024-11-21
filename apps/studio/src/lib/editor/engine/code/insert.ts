import type { ActionElement, ActionLocation, PasteParams } from '@onlook/models/actions';
import { CodeActionType, type CodeInsert } from '@onlook/models/actions';
import { EditorAttributes } from '@onlook/models/constants';
import { twMerge } from 'tailwind-merge';
import { getCssClasses } from './helpers';

export function getInsertedElement(
    actionElement: ActionElement,
    location: ActionLocation,
    pasteParams: PasteParams | null,
): CodeInsert {
    const insertedElement: CodeInsert = {
        type: CodeActionType.INSERT,
        oid: actionElement.oid,
        tagName: actionElement.tagName,
        children: [],
        attributes: { className: actionElement.attributes['className'] || '' },
        textContent: actionElement.textContent,
        location,
        pasteParams,
    };

    // Update classname from style
    const newClasses = getCssClasses(actionElement.oid, actionElement.styles);
    insertedElement.attributes['className'] = twMerge(
        insertedElement.attributes['className'] || '',
        newClasses,
    );
    insertedElement.attributes[EditorAttributes.DATA_ONLOOK_ID] = actionElement.oid;

    if (actionElement.children) {
        insertedElement.children = actionElement.children.map((child) =>
            getInsertedElement(child, location, null),
        );
    }
    return insertedElement;
}
