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

export function getInputValues(value: string): { mode: LayoutMode, value: string } {
    if (value === 'fit-content') return { mode: LayoutMode.Fit, value: value }
    if (value === '100%' || value === 'auto') return { mode: LayoutMode.Fill, value: "100%" }
    if (value.includes('%')) return { mode: LayoutMode.Relative, value: value }
    return { mode: LayoutMode.Fixed, value: value }
}

export function getRelativeValue(property: LayoutProperty, el: HTMLElement): string {
    if (!el.parentElement) return '100%'
    const parentVal = property === LayoutProperty.width ? el.parentElement.clientWidth : el.parentElement.clientHeight;
    const elVal = property === LayoutProperty.width ? el.clientWidth : el.clientHeight;
    return `${((elVal / parentVal) * 100).toFixed(0)}%`
}

export function getStyles(property: LayoutProperty, mode: LayoutMode, value: string, el: HTMLElement): Record<string, string> {
    let MODE_PROPERTY_MAP = {
        [LayoutMode.Fit]: 'fit-content',
        [LayoutMode.Fill]: "100%",
        [LayoutMode.Relative]: getRelativeValue(property, el),
        [LayoutMode.Fixed]: `${property === LayoutProperty.width ? el.clientWidth : el.clientHeight}px`
    }
    return {
        [property]: MODE_PROPERTY_MAP[mode] || value
    }
}

export function getRowColumnCount(value: string): number {
    return value.split(' ').length;
}

export function generateRowColumnTemplate(value: string): string {
    return `repeat(${value}, 1fr)`
}