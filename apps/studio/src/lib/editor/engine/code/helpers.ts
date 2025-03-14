import type { CodeDiffRequest } from '@onlook/models/code';
import { twMerge } from 'tailwind-merge';
import { CssToTailwindTranslator } from '/common/helpers/twTranslator';
import { StyleChangeType, type StyleChange } from '@onlook/models/actions';

export async function getOrCreateCodeDiffRequest(
    oid: string,
    oidToCodeChange: Map<string, CodeDiffRequest>,
): Promise<CodeDiffRequest> {
    let diffRequest = oidToCodeChange.get(oid);
    if (!diffRequest) {
        diffRequest = {
            oid,
            structureChanges: [],
            attributes: {},
            textContent: null,
            overrideClasses: null,
        };
        oidToCodeChange.set(oid, diffRequest);
    }
    return diffRequest;
}

export function addTailwindToRequest(
    request: CodeDiffRequest,
    styles: Record<string, StyleChange>,
): void {
    const newClasses = getTailwindClasses(request.oid, styles);
    request.attributes['className'] = twMerge(request.attributes['className'] || '', newClasses);
}

export function getTailwindClasses(oid: string, styles: Record<string, StyleChange>) {
    const css = createCSSRuleString(oid, styles);
    const tw = CssToTailwindTranslator(css);
    return tw.data.map((res) => res.resultVal);
}

export function createCSSRuleString(oid: string, styles: Record<string, StyleChange>) {
    const cssString = Object.entries(styles)
        .map(
            ([property, value]) =>
                `${property.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${
                    value.type === StyleChangeType.Custom
                        ? `var(--${value.value})`
                        : value.value.trim()
                };`,
        )
        .join(' ');
    return `${oid} { ${cssString} }`;
}
