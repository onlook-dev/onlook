import { WebviewTag } from 'electron';
import { nanoid } from 'nanoid';
import { EditorEngine } from '..';
import { EditorAttributes } from '/common/constants';
import { escapeSelector } from '/common/helpers';
import { InsertPos } from '/common/models';
import { ActionElement, GroupActionTarget, GroupElementsAction } from '/common/models/actions';
import { WebViewElement } from '/common/models/element';

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

    canGroupElements(elements: WebViewElement[]) {
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

        const parentSelector = elements[0].parent?.selector;
        if (!parentSelector) {
            return false;
        }

        const sameParent = elements.every((el) => el.parent?.selector === parentSelector);
        if (!sameParent) {
            return false;
        }

        return true;
    }

    async getGroupAction(selectedEls: WebViewElement[]): Promise<GroupElementsAction | null> {
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

        const parentSelector = selectedEls[0].parent!.selector;
        const container = await this.getContainerElement(parentSelector, webview);

        return {
            type: 'group-elements',
            targets: targets,
            location: {
                position: InsertPos.INDEX,
                targetSelector: parentSelector,
                index: Math.min(...targets.map((t) => t.index)),
            },
            webviewId: webview.id,
            container,
        };
    }

    async getGroupTargets(
        selectedEls: WebViewElement[],
        webview: WebviewTag,
    ): Promise<GroupActionTarget[]> {
        const targets: GroupActionTarget[] = [];

        for (const el of selectedEls) {
            const originalIndex: number | undefined = (await webview.executeJavaScript(
                `window.api?.getElementIndex('${escapeSelector(el.selector)}')`,
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

    async getContainerElement(parentSelector: string, webview: WebviewTag): Promise<ActionElement> {
        const parentDomEl = await webview.executeJavaScript(
            `window.api?.getElementWithSelector('${escapeSelector(parentSelector)}', true)`,
        );

        const styles: Record<string, string> = {
            // Layout
            display: parentDomEl.styles.display,

            // Flex
            flexDirection: parentDomEl.styles.flexDirection,
            justifyContent: parentDomEl.styles.justifyContent,
            alignItems: parentDomEl.styles.alignItems,
            gap: parentDomEl.styles.gap,

            // Grid
            gridTemplateColumns: parentDomEl.styles.gridTemplateColumns,
            gridTemplateRows: parentDomEl.styles.gridTemplateRows,
        };

        const uuid = nanoid();
        const selector = `[${EditorAttributes.DATA_ONLOOK_UNIQUE_ID}="${uuid}"]`;
        const container: ActionElement = {
            selector,
            uuid,
            styles,
            tagName: 'div',
            children: [],
            attributes: {
                [EditorAttributes.DATA_ONLOOK_UNIQUE_ID]: uuid,
                [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
            },
        };

        return container;
    }
}
