import { ActionTarget, MoveActionLocation } from '/common/models/actions';
import { CodeGroup } from '/common/models/actions/code';
import { TemplateNode } from '/common/models/element/templateNode';

export function getGroupElement(
    targets: Array<ActionTarget>,
    location: MoveActionLocation,
    getTemplateNode: (selector: string) => TemplateNode | undefined,
): CodeGroup {
    // Create container which is a codeinsert
    // Create targets which is a coderemove array
}
