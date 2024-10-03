export function getStyles(element: HTMLElement): Record<string, string> {
    const computed = getComputedStyle(element);
    const inline = getInlineStyles(element);
    const stylesheet = getStylesheetStyles(element);
    const styles: Record<string, string> = { ...computed, ...inline, ...stylesheet };
    return styles;
}

export function getComputedStyleBySelector(selector: string): Record<string, string> {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
        return {};
    }
    return getComputedStyle(element);
}

function getComputedStyle(element: HTMLElement): Record<string, string> {
    const computedStyle = JSON.parse(JSON.stringify(window.getComputedStyle(element)));
    computedStyle.width = 'auto';
    computedStyle.height = 'auto';
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
