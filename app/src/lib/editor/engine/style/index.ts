import { makeAutoObservable, reaction } from 'mobx';
import { getGroupedStyles } from '../../styles/group';
import { ElementStyle } from '../../styles/models';
import { ActionManager } from '../action';
import { ElementManager } from '../element';
import { ActionTargetWithSelector, Change } from '/common/actions';
import { DomElement } from '/common/models/element';

export interface GroupedStyles {
    styles: Record<string, Record<string, ElementStyle[]>>;
    parentRect: DOMRect;
    rect: DOMRect;
}

export class StyleManager {
    selectedStyles: Map<string, GroupedStyles> = new Map();
    private selectedElementsDisposer: () => void;

    constructor(
        private action: ActionManager,
        private elements: ElementManager,
    ) {
        makeAutoObservable(this);

        this.selectedElementsDisposer = reaction(
            () => this.elements.selected,
            (selectedElements) => this.onSelectedElementsChanged(selectedElements),
        );
    }

    updateElementStyle(style: string, change: Change<string>) {
        const targets: Array<ActionTargetWithSelector> = this.elements.selected.map((s) => ({
            webviewId: s.webviewId,
            selector: s.selector,
        }));

        this.action.run({
            type: 'update-style',
            targets: targets,
            style: style,
            change: change,
        });
    }

    private onSelectedElementsChanged(selectedElements: DomElement[]) {
        const newSelectedStyles = new Map<string, GroupedStyles>();
        for (const selectedEl of selectedElements) {
            const groupedStyle: GroupedStyles = {
                styles: getGroupedStyles(selectedEl.styles),
                parentRect: selectedEl?.parent?.rect ?? ({} as DOMRect),
                rect: selectedEl?.rect ?? ({} as DOMRect),
            };
            newSelectedStyles.set(selectedEl.selector, groupedStyle);
        }
        this.selectedStyles = newSelectedStyles;
    }

    dispose() {
        this.selectedElementsDisposer();
    }
}
