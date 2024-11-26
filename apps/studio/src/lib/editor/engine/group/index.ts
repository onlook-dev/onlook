import { createDomId, createOid } from '@/lib/utils';
import type {
    ActionElement,
    ActionTarget,
    GroupContainer,
    GroupElementsAction,
    UngroupElementsAction,
} from '@onlook/models/actions';
import type { DomElement } from '@onlook/models/element';
import type { EditorEngine } from '..';

export class GroupManager {
    constructor(private editorEngine: EditorEngine) {}

    async groupSelectedElements() {
        const selectedEls = this.editorEngine.elements.selected;
        const groupTarget = this.getGroupParentId(selectedEls);
        if (!groupTarget) {
            console.error('Failed to get group target');
            return;
        }
        const { webviewId, parentDomId } = groupTarget;
        const groupAction = await this.getGroupAction(webviewId, parentDomId, selectedEls);

        if (!groupAction) {
            console.error('Failed to get group action');
            return;
        }

        this.editorEngine.action.run(groupAction);
    }

    async ungroupSelectedElement() {
        if (!this.canUngroupElement()) {
            console.error('Cannot ungroup elements');
            return;
        }

        const selectedEl = this.editorEngine.elements.selected[0];
        const ungroupAction = await this.getUngroupAction(selectedEl);
        if (!ungroupAction) {
            console.error('Failed to get ungroup action');
            return;
        }

        this.editorEngine.action.run(ungroupAction);
    }

    getGroupParentId(
        elements: DomElement[],
        log = true,
    ): { webviewId: string; parentDomId: string } | null {
        if (elements.length === 0) {
            if (log) {
                console.error('No elements to group');
            }
            return null;
        }
        const webviewId = elements[0].webviewId;
        const sameWebview = elements.every((el) => el.webviewId === webviewId);

        if (!sameWebview) {
            if (log) {
                console.error('Selected elements are not in the same webview');
            }
            return null;
        }

        const parentDomId = elements[0].parent?.domId;
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

        return { webviewId, parentDomId };
    }

    canGroupElements() {
        return this.getGroupParentId(this.editorEngine.elements.selected, false) !== null;
    }

    canUngroupElement() {
        return this.editorEngine.elements.selected.length === 1;
    }

    async getGroupAction(
        webviewId: string,
        parentDomId: string,
        selectedEls: DomElement[],
    ): Promise<GroupElementsAction | null> {
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return null;
        }

        const anyParent = selectedEls.find((el) => el.parent)?.parent;

        if (!anyParent) {
            console.error('Failed to find parent target');
            return null;
        }

        const parentTarget: ActionTarget = {
            webviewId,
            domId: anyParent.domId,
            oid: anyParent.oid,
        };

        const children: ActionTarget[] = selectedEls.map((el) => ({
            webviewId: el.webviewId,
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
        const webview = this.editorEngine.webviews.getWebview(selectedEl.webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return null;
        }

        const parent = selectedEl.parent;
        if (!parent) {
            console.error('Failed to get parent');
            return null;
        }

        // Container is the selected element
        const actionContainer: ActionElement = await webview.executeJavaScript(
            `window.api?.getActionElementByDomId('${selectedEl.domId}', true)`,
        );
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

        // Children to be spread where container was
        const targets: ActionTarget[] = actionContainer.children.map((child) => {
            return {
                webviewId: selectedEl.webviewId,
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
}
