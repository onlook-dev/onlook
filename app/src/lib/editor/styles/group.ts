import { CompoundStyleImpl, SingleStyle } from '.';
import { LayoutMode } from './autolayout';
import { CompoundStyleKey, StyleType } from './models';
import { ELEMENT_STYLE_UNITS } from './units';

export const PositionGroup = [
    new SingleStyle('width', '', 'Width', StyleType.Dimensions, {
        units: Object.values(LayoutMode),
        max: 1000,
    }),
    new SingleStyle('height', '', 'Height', StyleType.Dimensions, {
        units: Object.values(LayoutMode),
        max: 1000,
    }),
];

export const LayoutGroup = [
    new CompoundStyleImpl(
        CompoundStyleKey.Display,
        new SingleStyle('display', 'flex', 'Type', StyleType.Select, {
            options: ['block', 'flex', 'grid'],
        }),
        [
            new SingleStyle('flexDirection', 'row', 'Direction', StyleType.Select, {
                options: ['row', 'column'],
            }),
            new SingleStyle('justifyContent', 'flex-start', 'Justify', StyleType.Select, {
                options: ['flex-start', 'center', 'flex-end', 'space-between'],
            }),
            new SingleStyle('alignItems', 'flex-start', 'Align', StyleType.Select, {
                options: ['flex-start', 'center', 'flex-end', 'space-between'],
            }),
            new SingleStyle('gridTemplateColumns', '', 'Columns', StyleType.Text),
            new SingleStyle('gridTemplateRows', '', 'Rows', StyleType.Text),
            new SingleStyle('gap', '0px', 'Gap', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
        ],
    ),
    new CompoundStyleImpl(
        CompoundStyleKey.Margin,
        new SingleStyle('margin', '', 'Margin', StyleType.Number, {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        }),
        [
            new SingleStyle('marginLeft', '', 'Left', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyle('marginTop', '', 'Top', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyle('marginRight', '', 'Right', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyle('marginBottom', '', 'Bottom', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
        ],
    ),
    new CompoundStyleImpl(
        CompoundStyleKey.Padding,
        new SingleStyle('padding', '', 'Padding', StyleType.Number, {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        }),
        [
            new SingleStyle('paddingLeft', '', 'Left', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyle('paddingTop', '', 'Top', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
            new SingleStyle('paddingRight', '', 'Right', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyle('paddingBottom', '', 'Bottom', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
        ],
    ),
];

export const StyleGroup = [
    new SingleStyle('opacity', '100', 'Opacity', StyleType.Number, {
        units: ['%'],
        max: 100,
    }),
    new SingleStyle('backgroundColor', '', 'Background', StyleType.Color),
    new CompoundStyleImpl(
        CompoundStyleKey.Corners,
        new SingleStyle('borderRadius', '', 'Corners', StyleType.Number, {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        }),
        [
            new SingleStyle(
                'borderTopLeftRadius',
                '',
                'Top Left',
                StyleType.Number,

                {
                    units: ELEMENT_STYLE_UNITS,
                    max: 1000,
                },
            ),

            new SingleStyle(
                'borderTopRightRadius',
                '',
                'Top Right',
                StyleType.Number,

                {
                    units: ELEMENT_STYLE_UNITS,
                    max: 1000,
                },
            ),

            new SingleStyle(
                'borderBottomLeftRadius',
                '',
                'Bottom Left',
                StyleType.Number,

                {
                    units: ELEMENT_STYLE_UNITS,
                    max: 1000,
                },
            ),

            new SingleStyle(
                'borderBottomRightRadius',
                '',
                'Bottom Right',
                StyleType.Number,

                {
                    units: ELEMENT_STYLE_UNITS,
                    max: 1000,
                },
            ),
        ],
    ),
    new CompoundStyleImpl(
        CompoundStyleKey.Border,
        new SingleStyle('borderColor', '', 'Border', StyleType.Color),
        [
            new SingleStyle('borderWidth', '', 'Width', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
            new SingleStyle('borderStyle', '', 'Style', StyleType.Select, {
                options: ['solid', 'dotted', 'dashed'],
            }),
        ],
    ),
];

export const TextGroup = [
    new SingleStyle('color', '#000000', 'Color', StyleType.Color),

    new SingleStyle(
        'fontSize',
        '16px',
        'Size',
        StyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        },
    ),
    new SingleStyle(
        'fontWeight',
        'normal',
        'Weight',
        StyleType.Select,

        {
            options: [
                'lighter',
                'normal',
                'bold',
                'bolder',
                '100',
                '200',
                '300',
                '400',
                '500',
                '600',
                '700',
                '800',
                '900',
            ],
        },
    ),
    new SingleStyle(
        'letterSpacing',
        '0px',
        'Letter',
        StyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 100,
        },
    ),
    new SingleStyle(
        'lineHeight',
        '100%',
        'Line Height',
        StyleType.Number,

        {
            units: ['%', 'px'],
            max: 1000,
        },
    ),
    new SingleStyle(
        'textAlign',
        'start',
        'Align',
        StyleType.Select,

        {
            options: ['start', 'center', 'end'],
        },
    ),
];
