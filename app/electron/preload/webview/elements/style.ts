const inheritedProperties = new Set([
    'azimuth',
    'border-collapse',
    'border-spacing',
    'caption-side',
    'color',
    'cursor',
    'direction',
    'elevation',
    'empty-cells',
    'font-family',
    'font-size',
    'font-style',
    'font-variant',
    'font-weight',
    'font',
    'letter-spacing',
    'line-height',
    'list-style-image',
    'list-style-position',
    'list-style-type',
    'list-style',
    'orphans',
    'pitch-range',
    'pitch',
    'quotes',
    'richness',
    'speak-header',
    'speak-numeral',
    'speak-punctuation',
    'speak',
    'speech-rate',
    'stress',
    'text-align',
    'text-indent',
    'text-transform',
    'visibility',
    'voice-family',
    'volume',
    'white-space',
    'widows',
    'word-spacing',
]);

export function getStyles(element) {
    // Initialize with computed styles
    const computedStyle = window.getComputedStyle(element);
    const consolidatedStyles = {};

    // Helper function to add a style to our consolidated object
    function addStyle(prop, value) {
        if (value !== '' && value !== null && value !== undefined) {
            consolidatedStyles[prop] = value;
        }
    }

    // Add computed styles first
    for (let i = 0; i < computedStyle.length; i++) {
        const prop = computedStyle[i];
        addStyle(prop, computedStyle.getPropertyValue(prop));
    }

    // Function to parse CSS text
    function parseCssText(cssText) {
        const styles = {};
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

    // Overwrite with inline styles
    const inlineStyles = parseCssText(element.style.cssText);
    Object.entries(inlineStyles).forEach(([prop, value]) => addStyle(prop, value));

    // Overwrite with attribute styles
    Array.from(element.attributes)
        .filter((attr) => attr.name.startsWith('style-'))
        .forEach((attr) => addStyle(attr.name.slice(6), attr.value));

    // Overwrite with stylesheet styles
    const sheets = document.styleSheets;
    for (let i = 0; i < sheets.length; i++) {
        let rules;
        try {
            rules = sheets[i].cssRules || sheets[i].rules;
        } catch (e) {
            console.warn("Can't read the css rules of: " + sheets[i].href, e);
            continue;
        }
        for (let j = 0; j < rules.length; j++) {
            try {
                if (element.matches(rules[j].selectorText)) {
                    const ruleStyles = parseCssText(rules[j].style.cssText);
                    Object.entries(ruleStyles).forEach(([prop, value]) => addStyle(prop, value));
                }
            } catch (e) {
                console.warn('Error', e.name, e.message);
            }
        }
    }

    // Add inherited styles
    let parent = element.parentElement;
    while (parent) {
        const parentStyles = window.getComputedStyle(parent);
        for (const prop of inheritedProperties) {
            if (!(prop in consolidatedStyles)) {
                const value = parentStyles.getPropertyValue(prop);
                addStyle(prop, value);
            }
        }
        // Include custom properties (CSS variables)
        for (let i = 0; i < parentStyles.length; i++) {
            const prop = parentStyles[i];
            if (prop.startsWith('--') && !(prop in consolidatedStyles)) {
                addStyle(prop, parentStyles.getPropertyValue(prop));
            }
        }
        parent = parent.parentElement;
    }

    // Create a proxy to mimic CSSStyleDeclaration behavior
    return new Proxy(consolidatedStyles, {
        get(target, prop) {
            if (typeof prop === 'string') {
                // Convert camelCase to kebab-case for property names
                const kebabCase = prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
                if (kebabCase in target) {
                    return target[kebabCase];
                }
            }
            if (prop === 'getPropertyValue') {
                return (cssProp) => target[cssProp] || '';
            }
            if (prop === 'item') {
                return (index) => Object.keys(target)[index];
            }
            if (prop === 'length') {
                return Object.keys(target).length;
            }
            return target[prop];
        },
    });
}
