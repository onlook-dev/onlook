import { getImmediateTextContent } from '../helpers';
import { getStyles } from '../style';
import { getUniqueSelector } from '/common/helpers';
import { ActionElement } from '/common/models/actions';

export function getActionElement(el: HTMLElement): ActionElement {
    return {
        tagName: el.tagName.toLowerCase(),
        selector: getUniqueSelector(el),
        children: Array.from(el.children).map((child) => getActionElement(child as HTMLElement)),
        attributes: {},
        textContent: getImmediateTextContent(el),
        styles: getStyles(el),
    };
}
