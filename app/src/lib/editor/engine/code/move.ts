import { ActionTarget, MoveActionLocation } from '/common/models/actions';
import { CodeActionType, CodeMove } from '/common/models/actions/code';
import { TemplateNode } from '/common/models/element/templateNode';

export function getMovedElements(
    targets: Array<ActionTarget>,
    location: MoveActionLocation,
    getTemplateNode: (selector: string) => TemplateNode | undefined,
): CodeMove[] {
    const movedEls: CodeMove[] = [];

    for (const target of targets) {
        const childTemplateNode = getTemplateNode(target.selector);
        if (!childTemplateNode) {
            console.error('Failed to get template node for moving selector', target.selector);
            continue;
        }
        movedEls.push({
            type: CodeActionType.MOVE,
            location: location,
            selector: target.selector,
            childTemplateNode: childTemplateNode,
            uuid: target.uuid,
        });
    }
    return movedEls;
}
