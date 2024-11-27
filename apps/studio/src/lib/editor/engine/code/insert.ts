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
    // Generate Tailwind className from style as an attribute
    const newClasses = getCssClasses(actionElement.oid, actionElement.styles);
    const attributes = {
        className: twMerge(
            actionElement.attributes['className'],
            actionElement.attributes['class'],
            newClasses,
        ),
        [EditorAttributes.DATA_ONLOOK_ID]: actionElement.oid,
    };

    let children: CodeInsert[] = [];
    if (actionElement.children) {
        children = actionElement.children.map((child) => getInsertedElement(child, location, null));
    }

    const insertedElement: CodeInsert = {
        type: CodeActionType.INSERT,
        oid: actionElement.oid,
        tagName: actionElement.tagName,
        children,
        attributes,
        textContent: actionElement.textContent,
        location,
        pasteParams,
    };

    return insertedElement;
}
