import { createDomId } from '@/lib/utils';
import type {
    ActionElement,
    ActionLocation,
    GroupActionTarget,
    GroupElementsAction,
    UngroupElementsAction,
} from '@onlook/models/actions';
import { EditorAttributes } from '@onlook/models/constants';
import { InsertPos } from '@onlook/models/editor';
import type { DomElement } from '@onlook/models/element';
import type { WebviewTag } from 'electron';
import type { EditorEngine } from '..';

export class GroupManager {
    constructor(private editorEngine: EditorEngine) {}

    async groupSelectedElements() {
        const selectedEls = this.editorEngine.elements.selected;
        if (!this.canGroupElements(selectedEls)) {
            console.error('Cannot group elements');
            return;
        }

        const groupAction = await this.getGroupAction(selectedEls);
        if (!groupAction) {
            console.error('Failed to get group action');
            return;
        }

        this.editorEngine.action.run(groupAction);
    }

    async ungroupSelectedElement() {
        const selectedEls = this.editorEngine.elements.selected;
        if (!this.canUngroupElement(selectedEls)) {
            console.error('Cannot ungroup elements');
            return;
        }

        const ungroupAction = await this.getUngroupAction(selectedEls[0]);
        if (!ungroupAction) {
            console.error('Failed to get ungroup action');
            return;
        }

        this.editorEngine.action.run(ungroupAction);
    }

    canGroupElements(elements: DomElement[]) {
        if (elements.length === 0) {
            return false;
        }
        if (elements.length === 1) {
            return true;
        }

        const sameWebview = elements.every((el) => el.webviewId === elements[0].webviewId);

        if (!sameWebview) {
            return false;
        }

        const parentDomId = elements[0].parent?.domId;
        if (!parentDomId) {
            return false;
        }

        const sameParent = elements.every((el) => el.parent?.domId === parentDomId);
        if (!sameParent) {
            return false;
        }

        return true;
    }

    canUngroupElement(elements: DomElement[]) {
        return elements.length === 1;
    }

    async getGroupAction(selectedEls: DomElement[]): Promise<GroupElementsAction | null> {
        const webview = this.editorEngine.webviews.getWebview(selectedEls[0].webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return null;
        }

        const targets = await this.getGroupTargets(selectedEls, webview);
        if (targets.length === 0) {
            console.error('No group targets found');
            return null;
        }

        const parent = selectedEls[0].parent;
        if (!parent) {
            console.error('No parent found');
            return null;
        }

        const parentDomId = parent.domId;
        const parentOid = parent.oid;
        const container = await this.getContainerElement(parentDomId, webview);

        return {
            type: 'group-elements',
            targets: targets,
            location: {
                position: InsertPos.INDEX,
                targetDomId: parentDomId,
                targetOid: parentOid,
                index: Math.min(...targets.map((t) => t.index)),
            },
            webviewId: webview.id,
            container,
        };
    }

    async getUngroupAction(selectedEl: DomElement): Promise<UngroupElementsAction | null> {
        const webview = this.editorEngine.webviews.getWebview(selectedEl.webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return null;
        }

        const parentSelector = selectedEl.parent?.domId;
        if (!parentSelector) {
            console.error('Failed to get parent selector');
            return null;
        }

        // Container is the selectedEl
        const container: ActionElement | null = await webview.executeJavaScript(
            `window.api?.getActionElementByDomId('${selectedEl.domId}', true)`,
        );
        if (!container) {
            console.error('Failed to get container element');
            return null;
        }

        // Where container will be removed
        const location: ActionLocation | null = await webview.executeJavaScript(
            `window.api?.getActionLocation('${selectedEl.domId}')`,
        );

        if (!location) {
            console.error('Failed to get location');
            return null;
        }

        // Children to be spread where container was
        const targets: GroupActionTarget[] = container.children.map((child, index) => {
            const newIndex = location.index + index;
            return {
                webviewId: selectedEl.webviewId,
                selector: child.selector,
                uuid: child.uuid,
                index: newIndex,
            };
        });

        return {
            type: 'ungroup-elements',
            targets,
            location,
            webviewId: webview.id,
            container,
        };
    }

    async getGroupTargets(
        selectedEls: DomElement[],
        webview: WebviewTag,
    ): Promise<GroupActionTarget[]> {
        const targets: GroupActionTarget[] = [];

        for (const el of selectedEls) {
            const originalIndex: number | undefined = (await webview.executeJavaScript(
                `window.api?.getElementIndex('${el.domId}')`,
            )) as number | undefined;

            if (originalIndex === undefined) {
                console.error('Failed to get element location');
                continue;
            }

            targets.push({
                ...el,
                index: originalIndex,
            });
        }
        return targets;
    }

    async getContainerElement(parentDomId: string, webview: WebviewTag): Promise<ActionElement> {
        const parentDomEl = await webview.executeJavaScript(
            `window.api?.getDomElementWithDomId('${parentDomId}', true)`,
        );

        const styles: Record<string, string> = {
            // Layout
            display: parentDomEl.styles.display,

            // Flex
            flexDirection: parentDomEl.styles.flexDirection,
            justifyContent: parentDomEl.styles.justifyContent,
            alignItems: parentDomEl.styles.alignItems,
            gap: parentDomEl.styles.gap,
        };

        const domId = createDomId();
        const container: ActionElement = {
            domId,
            webviewId: webview.id,
            oid: null,
            styles,
            tagName: 'div',
            children: [],
            attributes: {
                [EditorAttributes.DATA_ONLOOK_ID]: uuid,
                [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
            },
        };

        return container;
    }
}
