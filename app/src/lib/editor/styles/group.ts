import { ElementStyleImpl } from '.';
import { LayoutMode } from './autolayout';
import {
    ElementStyle,
    ElementStyleGroup,
    ElementStyleSubGroup,
    ElementStyleSubGroupImpl,
    ElementStyleType,
} from './models';
import { ELEMENT_STYLE_UNITS } from './units';

export const groupOrder: string[] = [
    ElementStyleGroup.Size,
    ElementStyleGroup.Position,
    ElementStyleGroup.Layout,
    ElementStyleGroup.Style,
    ElementStyleGroup.Text,
    ElementStyleGroup.Effects,
];

export const GROUP_MAPPING: Record<ElementStyleGroup, (ElementStyleSubGroup | ElementStyle)[]> = {
    [ElementStyleGroup.Position]: [
        new ElementStyleImpl('width', '', 'Width', ElementStyleType.Dimensions, {
            units: Object.values(LayoutMode),
            max: 1000,
        }),
        new ElementStyleImpl('height', '', 'Height', ElementStyleType.Dimensions, {
            units: Object.values(LayoutMode),
            max: 1000,
        }),
    ],
    [ElementStyleGroup.Layout]: [
        new ElementStyleSubGroupImpl(
            'Display',
            new ElementStyleImpl('display', 'flex', 'Type', ElementStyleType.Select, {
                selectValues: ['block', 'flex', 'grid'],
            }),
            [
                new ElementStyleImpl('flexDirection', 'row', 'Direction', ElementStyleType.Select, {
                    selectValues: ['row', 'column'],
                }),
                new ElementStyleImpl(
                    'justifyContent',
                    'flex-start',
                    'Justify',
                    ElementStyleType.Select,
                    {
                        selectValues: ['flex-start', 'center', 'flex-end', 'space-between'],
                    },
                ),
                new ElementStyleImpl('alignItems', 'flex-start', 'Align', ElementStyleType.Select, {
                    selectValues: ['flex-start', 'center', 'flex-end', 'space-between'],
                }),
                new ElementStyleImpl('gridTemplateColumns', '', 'Columns', ElementStyleType.Text),
                new ElementStyleImpl('gridTemplateRows', '', 'Rows', ElementStyleType.Text),
                new ElementStyleImpl('gap', '0px', 'Gap', ElementStyleType.Number, {
                    units: ELEMENT_STYLE_UNITS,
                    max: 1000,
                }),
            ],
        ),
    ],
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
