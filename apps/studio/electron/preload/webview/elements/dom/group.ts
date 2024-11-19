import type {
    ActionElement,
    ActionElementLocation,
    GroupActionTarget,
} from '@onlook/models/actions';
import { EditorAttributes } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { getOrAssignDomId } from '../../ids';
import { getDomElement } from '../helpers';
import { createElement } from './insert';
import { selectorFromDomId } from '/common/helpers';

export function groupElements(
    targets: Array<GroupActionTarget>,
    location: ActionElementLocation,
    container: ActionElement,
): DomElement | null {
    const parentEl: HTMLElement | null = document.querySelector(
        selectorFromDomId(location.targetDomId),
    );
    if (!parentEl) {
        console.error('Failed to find parent element', location.targetDomId);
        return null;
    }

    const containerEl = createElement(container);
    parentEl.insertBefore(containerEl, parentEl.children[location.index]);

    targets
        .map((target) => {
            const el = document.querySelector(selectorFromDomId(target.domId));
            if (!el) {
                console.error('Failed to find element', target.domId);
                return null;
            }
            return el;
        })
        .filter((el) => el !== null)
        .sort((a, b) => {
            return (
                Array.from(parentEl.children).indexOf(a) - Array.from(parentEl.children).indexOf(b)
            );
        })
        .forEach((el) => {
            containerEl.appendChild(el.cloneNode(true));
            (el as HTMLElement).style.display = 'none';
        });

    return getDomElement(containerEl, true);
}

export function ungroupElements(
    targets: Array<GroupActionTarget>,
    location: ActionElementLocation,
    container: ActionElement,
): DomElement | null {
    const parentEl: HTMLElement | null = document.querySelector(
        selectorFromDomId(location.targetDomId),
    );
    if (!parentEl) {
        console.error('Failed to find parent element', location.targetDomId);
        return null;
    }

    const containerEl: HTMLElement | null = document.querySelector(
        selectorFromDomId(container.domId),
    );

    if (!containerEl) {
        console.error('Failed to find group element', selectorFromDomId(container.domId));
        return null;
    }

    containerEl.style.display = 'none';
    const groupChildren = Array.from(containerEl.children).filter((child) => child !== containerEl);

    groupChildren.forEach((child) => {
        child.setAttribute(EditorAttributes.DATA_ONLOOK_INSERTED, 'true');
        const target = targets.find((t) => t.domId === getOrAssignDomId(child as HTMLElement));
        if (target) {
            parentEl.insertBefore(child, parentEl.children[target.index]);
        }
    });

    return getDomElement(parentEl, true);
}
