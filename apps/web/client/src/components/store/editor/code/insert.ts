import { EditorAttributes } from '@onlook/constants';
import type { ActionElement, ActionLocation, PasteParams } from '@onlook/models/actions';
import { CodeActionType, type CodeInsert } from '@onlook/models/actions';
import { StyleChangeType } from '@onlook/models/style';
import { customTwMerge } from '@onlook/utility';
import { getTailwindClasses } from './tailwind';

export function getInsertedElement(
    actionElement: ActionElement,
    location: ActionLocation,
    pasteParams: PasteParams | null,
    codeBlock: string | null,
): CodeInsert {
    // Generate Tailwind className from style as an attribute
    const styles = Object.fromEntries(
        Object.entries(actionElement.styles).map(([key, value]) => [
            key,
            { value, type: StyleChangeType.Value },
        ]),
    );
    const newClasses = getTailwindClasses(actionElement.oid, styles);
    const attributes = {
        className: customTwMerge(
            actionElement.attributes['className'],
            actionElement.attributes['class'],
            newClasses,
        ),
        [EditorAttributes.DATA_ONLOOK_ID]: actionElement.oid,
        ...(actionElement.tagName.toLowerCase() === 'img' && {
            src: actionElement.attributes['src'],
            alt: actionElement.attributes['alt'],
        }),
    };

    let children: CodeInsert[] = [];
    if (actionElement.children) {
        children = actionElement.children.map((child) =>
            getInsertedElement(child, location, null, null),
        );
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
        codeBlock: codeBlock || null,
    };

    return insertedElement;
}
