import { twMerge } from 'tailwind-merge';
import { ActionElement, ActionElementLocation } from '../../../../../common/models/actions';
import { CodeActionType, CodeInsert } from '../../../../../common/models/actions/code';
import { getCssClasses } from './helpers';

export function getInsertedElement(
    actionElement: ActionElement,
    location: ActionElementLocation,
    styles: Record<string, string>,
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
    };

    // Update classname from style
    const newClasses = getCssClasses(insertedElement.location.targetSelector, styles);
    insertedElement.attributes['className'] = twMerge(
        insertedElement.attributes['className'] || '',
        newClasses,
    );

    if (actionElement.children) {
        insertedElement.children = actionElement.children.map((child) =>
            getInsertedElement(child, location, styles),
        );
    }
    return insertedElement;
}
