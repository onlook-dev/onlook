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
    if (value === 'fit-content') {
        return { mode: LayoutMode.Fit, value: value };
    }
    if (value === '100%' || value === 'auto') {
        return { mode: LayoutMode.Fill, value: '100%' };
    }
    if (value.includes('%')) {
        return { mode: LayoutMode.Relative, value: value };
    }
    return { mode: LayoutMode.Fixed, value: value };
}

export function getRelativeValue(
    property: LayoutProperty,
    childRect: DOMRect,
    parentRect: DOMRect,
): string {
    const parentDimension =
        property === LayoutProperty.width ? parentRect.width : parentRect.height;
    const childDimension = property === LayoutProperty.width ? childRect.width : childRect.height;
    return `${((childDimension / parentDimension) * 100).toFixed(0)}%`;
}

export function getAutolayoutStyles(
    property: LayoutProperty,
    mode: LayoutMode,
    value: string,
    childRect: DOMRect,
    parentRect: DOMRect,
): Record<string, string> {
    const MODE_PROPERTIES = {
        [LayoutMode.Fit]: 'fit-content',
        [LayoutMode.Fill]: '100%',
        [LayoutMode.Relative]: getRelativeValue(property, childRect, parentRect),
        [LayoutMode.Fixed]: `${property === LayoutProperty.width ? childRect.width : childRect.height}px`,
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
