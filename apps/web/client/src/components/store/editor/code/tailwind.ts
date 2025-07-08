import type { CodeDiffRequest } from '@onlook/models/code';
import { StyleChangeType, type StyleChange } from '@onlook/models/style';
import { CssToTailwindTranslator, propertyMap } from '@onlook/utility';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

export const customTwMerge = (...classLists: ClassNameValue[]): string => {
    const classes: string[] = [];

    const process = (c: ClassNameValue) => {
        if (!c) return;
        if (typeof c === 'string') {
            classes.push(c);
        } else if (Array.isArray(c)) {
            c.forEach(process);
        } else if (typeof c === 'object') {
            Object.keys(c).forEach((key) => {
                if ((c as Record<string, any>)[key]) {
                    classes.push(key);
                }
            });
        }
    };

    classLists.forEach(process);

    const all = classes.join(' ').split(/\s+/).filter(Boolean);
    const bgClasses = all.filter((c) => c.startsWith('bg-'));
    const latestBgClass = bgClasses.pop();
    const otherClasses = all.filter((c) => !c.startsWith('bg-'));

    return twMerge(otherClasses.join(' '), latestBgClass);
};

export function addTailwindToRequest(
    request: CodeDiffRequest,
    styles: Record<string, StyleChange>,
): void {
    const newClasses = getTailwindClasses(request.oid, styles);
    request.attributes['className'] = customTwMerge(request.attributes['className'] || '', newClasses);
}

export function getTailwindClasses(oid: string, styles: Record<string, StyleChange>): string[] {
    const customColors = Object.entries(styles).reduce(
        (acc, [key, style]) => {
            if (style.type === StyleChangeType.Custom) {
                acc[key] = style;
            }
            return acc;
        },
        {} as Record<string, StyleChange>,
    );
    const normalColors = Object.entries(styles).reduce(
        (acc, [key, style]) => {
            if (style.type !== StyleChangeType.Custom) {
                acc[key] = style;
            }
            return acc;
        },
        {} as Record<string, StyleChange>,
    );

    const css = createCSSRuleString(oid, normalColors);
    const tw = CssToTailwindTranslator(css);
    const twClasses = tw.data.map((res) => res.resultVal);

    const customClasses = Object.entries(customColors)
        .map(([key, style]) => {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            const css = propertyMap.get(cssKey.trim());
            if (typeof css === 'function') {
                return css(style.value, true);
            }
        })
        .filter((v) => v !== undefined);

    return [...twClasses, ...customClasses];
}

export function createCSSRuleString(oid: string, styles: Record<string, StyleChange>) {
    const cssString = Object.entries(styles)
        .map(
            ([property, value]) =>
                `${property.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value.value.trim()};`,
        )
        .join(' ');
    return `${oid} { ${cssString} }`;
}

