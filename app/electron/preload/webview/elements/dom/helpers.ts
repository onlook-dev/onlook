import { cssManager } from '../../style';
import { getImmediateTextContent } from '../helpers';
import { getUniqueSelector } from '/common/helpers';
import { ActionElement } from '/common/models/actions';

export function getActionElement(el: HTMLElement): ActionElement {
    const selector = getUniqueSelector(el);
    const styles = cssManager.getJsStyle(selector);

    return {
        tagName: el.tagName.toLowerCase(),
        selector: getUniqueSelector(el),
        children: Array.from(el.children).map((child) => getActionElement(child as HTMLElement)),
        attributes: {},
        textContent: getImmediateTextContent(el),
        styles,
    };
}
