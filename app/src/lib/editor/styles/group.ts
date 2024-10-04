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

export const GROUP_MAPPING: Record<ElementStyleGroup, ElementStyleSubGroup | ElementStyle> = {
    [ElementStyleGroup.Size]: ElementStyleSubGroup.Corners,
    [ElementStyleGroup.Position]: ElementStyleSubGroup.Margin,
    [ElementStyleGroup.Layout]: ElementStyleSubGroup.Display,
    [ElementStyleGroup.Style]: ElementStyleSubGroup.Border,
    [ElementStyleGroup.Text]: ElementStyleSubGroup.Display,
    [ElementStyleGroup.Effects]: ElementStyleSubGroup.Shadow,
};

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
