import type { CodeDiffRequest } from '@onlook/models/code';
import { twMerge } from 'tailwind-merge';
import { CssToTailwindTranslator } from '/common/helpers/twTranslator';

export async function getOrCreateCodeDiffRequest(
    oid: string,
    oidToCodeChange: Map<string, CodeDiffRequest>,
): Promise<CodeDiffRequest> {
    let diffRequest = oidToCodeChange.get(oid);
    if (!diffRequest) {
        diffRequest = {
            oid,
            insertedElements: [],
            movedElements: [],
            removedElements: [],
            groupElements: [],
            ungroupElements: [],
            attributes: {},
            textContent: null,
            overrideClasses: null,
        };
        oidToCodeChange.set(oid, diffRequest);
    }
    return diffRequest;
}

export function getTailwindClassChangeFromStyle(
    request: CodeDiffRequest,
    styles: Record<string, string>,
): void {
    const newClasses = getCssClasses(request.oid, styles);
    request.attributes['className'] = twMerge(request.attributes['className'] || '', newClasses);
}

export function getCssClasses(oid: string, styles: Record<string, string>) {
    const css = createCSSRuleString(oid, styles);
    const tw = CssToTailwindTranslator(css);
    return tw.data.map((res) => res.resultVal);
}

export function createCSSRuleString(oid: string, styles: Record<string, string>) {
    const cssString = Object.entries(styles)
        .map(
            ([property, value]) =>
                `${property.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`,
        )
        .join(' ');
    return `${oid} { ${cssString} }`;
}
