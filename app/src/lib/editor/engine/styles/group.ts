import { ELEMENT_STYLES } from '.';
import { ElementStyle, ElementStyleGroup, ElementStyleSubGroup } from './models';

export const groupOrder: string[] = [
    ElementStyleGroup.Size,
    ElementStyleGroup.Position,
    ElementStyleGroup.Layout,
    ElementStyleSubGroup.Display,
    ElementStyleSubGroup.Margin,
    ElementStyleSubGroup.Padding,
    ElementStyleGroup.Style,
    ElementStyleSubGroup.Corners,
    ElementStyleSubGroup.Border,
    ElementStyleSubGroup.Shadow,
    ElementStyleGroup.Text,
    ElementStyleGroup.Effects,
];

export function sortGroupsByCustomOrder(
    groups: Record<string, ElementStyle[]>,
): Record<string, ElementStyle[]> {
    const sortedGroups: Record<string, ElementStyle[]> = {};

    // Iterate through the groupOrder array to ensure custom order
    groupOrder.forEach((group) => {
        if (groups[group]) {
            // Check if the group exists in the input groups
            sortedGroups[group] = groups[group];
        }
    });

    return sortedGroups;
}

export function groupElementStyles(
    styles: ElementStyle[],
): Record<string, Record<string, ElementStyle[]>> {
    return styles.reduce<Record<string, Record<string, ElementStyle[]>>>((groups, style) => {
        // Initialize the main group and subgroup if they don't exist
        if (!groups[style.group]) {
            groups[style.group] = {};
        }

        const subGroup = style.subGroup || 'default';
        if (!groups[style.group][subGroup]) {
            groups[style.group][subGroup] = [];
        }

        // Add the style to the appropriate subgroup
        groups[style.group][subGroup].push(style);
        return groups;
    }, {});
}

export function getGroupedStyles(
    computedStyle: CSSStyleDeclaration,
): Record<string, Record<string, ElementStyle[]>> {
    const clonedElementStyles = JSON.parse(JSON.stringify(ELEMENT_STYLES));
    clonedElementStyles.forEach((style: any) => {
        style.value = computedStyle[style.key];
    });
    return groupElementStyles(clonedElementStyles);
}
