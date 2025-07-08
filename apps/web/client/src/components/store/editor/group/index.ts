import type { DomElement } from '@onlook/models';
import type {
    ActionTarget,
    GroupContainer,
    GroupElementsAction,
    UngroupElementsAction
} from '@onlook/models/actions';
import { createDomId, createOid } from '@onlook/utility';
import type { EditorEngine } from '../engine';

export class GroupManager {
    constructor(private editorEngine: EditorEngine) { }

    async groupSelectedElements() {
        const selectedEls = this.editorEngine.elements.selected;
        const groupTarget = this.getGroupParentId(selectedEls);
        if (!groupTarget) {
            console.error('Failed to get group target');
            return;
        }
        const { frameId, parentDomId } = groupTarget;
        const groupAction = await this.getGroupAction(frameId, parentDomId, selectedEls);

        if (!groupAction) {
            console.error('Failed to get group action');
            return;
        }

        await this.editorEngine.action.run(groupAction);
    }

    async ungroupSelectedElement() {
        if (!this.canUngroupElement()) {
            console.error('Cannot ungroup elements');
            return;
        }

        const selectedEl = this.editorEngine.elements.selected[0];
        if (!selectedEl) {
            console.error('No selected element');
            return;
        }

        const ungroupAction = await this.getUngroupAction(selectedEl);
        if (!ungroupAction) {
            console.error('Failed to get ungroup action');
            return;
        }

        await this.editorEngine.action.run(ungroupAction);
    }

    getGroupParentId(
        elements: DomElement[],
        log = true,
    ): { frameId: string; parentDomId: string } | null {
        if (elements.length === 0) {
            if (log) {
                console.error('No elements to group');
            }
            return null;
        }

        const frameId = elements[0]?.frameId;
        const sameFrame = elements.every((el) => el.frameId === frameId);

        if (!sameFrame) {
            if (log) {
                console.error('Selected elements are not in the same frame');
            }
            return null;
        }

        const parentDomId = elements[0]?.parent?.domId;
        if (!parentDomId) {
            if (log) {
                console.error('No parent found');
            }
            return null;
        }

        const sameParent = elements.every((el) => el.parent?.domId === parentDomId);
        if (!sameParent) {
            if (log) {
                console.error('Selected elements are not in the same parent');
            }
            return null;
        }


        if (!frameId) {
            if (log) {
                console.error('No frame id found');
            }
            return null;
        }

        return { frameId, parentDomId };
    }

    canGroupElements() {
        return this.getGroupParentId(this.editorEngine.elements.selected, false) !== null;
    }

    canUngroupElement() {
        return this.editorEngine.elements.selected.length === 1;
    }

    async getGroupAction(
        frameId: string,
        parentDomId: string,
        selectedEls: DomElement[],
    ): Promise<GroupElementsAction | null> {
        const frame = this.editorEngine.frames.get(frameId);
        if (!frame) {
            console.error('Failed to get frame');
            return null;
        }

        const anyParent = selectedEls.find((el) => el.parent)?.parent;

        if (!anyParent) {
            console.error('Failed to find parent target');
            return null;
        }

        const parentTarget: ActionTarget = {
            frameId: frameId,
            domId: anyParent.domId,
            oid: anyParent.oid,
        };

        const children: ActionTarget[] = selectedEls.map((el) => ({
            frameId: el.frameId,
            domId: el.domId,
            oid: el.oid,
        }));

        const container: GroupContainer = {
            domId: createDomId(),
            oid: createOid(),
            tagName: 'div',
            attributes: {},
        };

        return {
            type: 'group-elements',
            parent: parentTarget,
            children,
            container,
        };
    }

    async getUngroupAction(selectedEl: DomElement): Promise<UngroupElementsAction | null> {
        const frame = this.editorEngine.frames.get(selectedEl.frameId);
        if (!frame) {
            console.error('Failed to get frame');
            return null;
        }

        if (!selectedEl.parent) {
            console.error('Failed to get parent');
            return null;
        }

        // Container is the selected element
        if (!frame.view) {
            console.error('No frame view found');
            return null;
        }

        const actionContainer = await frame.view.getActionElement(selectedEl.domId);

        if (!actionContainer) {
            console.error('Failed to get container');
            return null;
        }

        const container: GroupContainer = {
            domId: actionContainer.domId,
            oid: actionContainer.oid,
            tagName: actionContainer.tagName,
            attributes: actionContainer.attributes,
        };

        const parent: ActionTarget = {
            frameId: selectedEl.frameId,
            domId: selectedEl.parent.domId,
            oid: selectedEl.parent.oid,
        };

        // Children to be spread where container was
        const targets: ActionTarget[] = actionContainer.children.map((child) => {
            return {
                frameId: selectedEl.frameId,
                domId: child.domId,
                oid: child.oid,
            };
        });

        return {
            type: 'ungroup-elements',
            parent,
            container,
            children: targets,
        };
    }

    clear() { }
}
