export enum LayoutProperty {
    width = 'width',
    height = 'height',
}

export enum LayoutMode {
    Fit = 'Fit',
    Fill = 'Fill',
    Relative = 'Relative',
    Fixed = 'Fixed',
}

export function getInputValues(value: string): {
    mode: LayoutMode;
    value: string;
} {
    if (value === 'fit-content') return { mode: LayoutMode.Fit, value: value };
    if (value === '100%' || value === 'auto') return { mode: LayoutMode.Fill, value: '100%' };
    if (value.includes('%')) return { mode: LayoutMode.Relative, value: value };
    return { mode: LayoutMode.Fixed, value: value };
}

export function getRelativeValue(
    property: LayoutProperty,
    computedStyles: CSSStyleDeclaration,
    parentRect: DOMRect,
): string {
    const { width, height } = computedStyles;
    const parentWidth = parentRect.width;
    const parentHeight = parentRect.height;

    const parentDimension = property === LayoutProperty.width ? parentWidth : parentHeight;
    const childDimension = property === LayoutProperty.width ? width : height;
    return `${((parseInt(childDimension) / parentDimension) * 100).toFixed(0)}%`;
}

export function getStyles(
    property: LayoutProperty,
    mode: LayoutMode,
    value: string,
    computedStyles: CSSStyleDeclaration,
    parentRect: DOMRect,
): Record<string, string> {
    const { width, height } = computedStyles;
    let MODE_PROPERTIES = {
        [LayoutMode.Fit]: 'fit-content',
        [LayoutMode.Fill]: '100%',
        [LayoutMode.Relative]: getRelativeValue(property, computedStyles, parentRect),
        [LayoutMode.Fixed]: `${property === LayoutProperty.width ? width : height}px`,
    };
    return {
        [property]: MODE_PROPERTIES[mode] || value,
    };
}

export function getRowColumnCount(value: string): number {
    return value.split(' ').length;
}

export function generateRowColumnTemplate(value: string): string {
    return `repeat(${value}, 1fr)`;
}
