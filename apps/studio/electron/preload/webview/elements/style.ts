import type { DomElementStyles } from '@onlook/models/element';
import { jsonClone } from '@onlook/utility';
import { elementFromDomId } from '/common/helpers';

export function getStyles(element: HTMLElement): DomElementStyles {
    const computed = getComputedStyle(element);
    const inline = getInlineStyles(element);
    const stylesheet = getStylesheetStyles(element);

    const defined = {
        width: 'auto',
        height: 'auto',
        ...inline,
        ...stylesheet,
    };

    return {
        defined,
        computed,
    };
}

export function getComputedStyleByDomId(domId: string): Record<string, string> {
    const element = elementFromDomId(domId);
    if (!element) {
        return {};
    }
    return getComputedStyle(element as HTMLElement);
}

function getComputedStyle(element: HTMLElement): Record<string, string> {
    const computedStyle = jsonClone(window.getComputedStyle(element)) as unknown as Record<
        string,
        string
    >;
    return computedStyle;
}

function getInlineStyles(element: HTMLElement) {
    const styles: Record<string, string> = {};
    const inlineStyles = parseCssText(element.style.cssText);
    Object.entries(inlineStyles).forEach(([prop, value]) => {
        styles[prop] = value;
    });
    return styles;
}

function getStylesheetStyles(element: HTMLElement) {
    const styles: Record<string, string> = {};
    const sheets = document.styleSheets;
    for (let i = 0; i < sheets.length; i++) {
        let rules: CSSStyleRule[];
        try {
            rules = (Array.from(sheets[i].cssRules) as CSSStyleRule[]) || sheets[i].rules;
        } catch (e) {
            console.warn("Can't read the css rules of: " + sheets[i].href, e);
            continue;
        }
        for (let j = 0; j < rules.length; j++) {
            try {
                if (element.matches(rules[j].selectorText)) {
                    const ruleStyles = parseCssText(rules[j].style.cssText);
                    Object.entries(ruleStyles).forEach(([prop, value]) => (styles[prop] = value));
                }
            } catch (e) {
                console.warn('Error', e);
            }
        }
    }
    return styles;
}

function parseCssText(cssText: string) {
    const styles: Record<string, string> = {};
    cssText.split(';').forEach((style) => {
        style = style.trim();
        if (!style) {
            return;
        }
        const [property, ...values] = style.split(':');
        styles[property.trim()] = values.join(':').trim();
    });
    return styles;
}
