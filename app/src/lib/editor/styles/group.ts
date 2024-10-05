import { CompoundStyleImpl, SingleStyleImpl } from '.';
import { LayoutMode } from './autolayout';
import { CompoundStyleKey, StyleType } from './models';
import { ELEMENT_STYLE_UNITS } from './units';

export const PositionGroup = [
    new SingleStyleImpl('width', '', 'Width', StyleType.Dimensions, {
        units: Object.values(LayoutMode),
        max: 1000,
    }),
    new SingleStyleImpl('height', '', 'Height', StyleType.Dimensions, {
        units: Object.values(LayoutMode),
        max: 1000,
    }),
];

export const LayoutGroup = [
    new CompoundStyleImpl(
        CompoundStyleKey.Display,
        new SingleStyleImpl('display', 'block', 'Type', StyleType.Select, {
            options: ['block', 'flex', 'grid'],
        }),
        [
            new SingleStyleImpl('flexDirection', 'row', 'Direction', StyleType.Select, {
                options: ['row', 'column'],
            }),
            new SingleStyleImpl('justifyContent', 'flex-start', 'Justify', StyleType.Select, {
                options: ['flex-start', 'center', 'flex-end', 'space-between'],
            }),
            new SingleStyleImpl('alignItems', 'flex-start', 'Align', StyleType.Select, {
                options: ['flex-start', 'center', 'flex-end', 'space-between'],
            }),
            new SingleStyleImpl('gridTemplateColumns', '', 'Columns', StyleType.Text),
            new SingleStyleImpl('gridTemplateRows', '', 'Rows', StyleType.Text),
            new SingleStyleImpl('gap', '0px', 'Gap', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
        ],
    ),
    new CompoundStyleImpl(
        CompoundStyleKey.Margin,
        new SingleStyleImpl('margin', '', 'Margin', StyleType.Number, {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        }),
        [
            new SingleStyleImpl('marginLeft', '', 'Left', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyleImpl('marginTop', '', 'Top', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyleImpl('marginRight', '', 'Right', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyleImpl('marginBottom', '', 'Bottom', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
        ],
    ),
    new CompoundStyleImpl(
        CompoundStyleKey.Padding,
        new SingleStyleImpl('padding', '', 'Padding', StyleType.Number, {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        }),
        [
            new SingleStyleImpl('paddingLeft', '', 'Left', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyleImpl('paddingTop', '', 'Top', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
            new SingleStyleImpl('paddingRight', '', 'Right', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),

            new SingleStyleImpl('paddingBottom', '', 'Bottom', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
        ],
    ),
];

export const StyleGroup = [
    new SingleStyleImpl('opacity', '100', 'Opacity', StyleType.Number, {
        units: ['%'],
        max: 100,
    }),
    new SingleStyleImpl('backgroundColor', '', 'Background', StyleType.Color),
    new CompoundStyleImpl(
        CompoundStyleKey.Corners,
        new SingleStyleImpl('borderRadius', '', 'Corners', StyleType.Number, {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        }),
        [
            new SingleStyleImpl(
                'borderTopLeftRadius',
                '',
                'Top Left',
                StyleType.Number,

                {
                    units: ELEMENT_STYLE_UNITS,
                    max: 1000,
                },
            ),

            new SingleStyleImpl(
                'borderTopRightRadius',
                '',
                'Top Right',
                StyleType.Number,

                {
                    units: ELEMENT_STYLE_UNITS,
                    max: 1000,
                },
            ),

            new SingleStyleImpl(
                'borderBottomLeftRadius',
                '',
                'Bottom Left',
                StyleType.Number,

                {
                    units: ELEMENT_STYLE_UNITS,
                    max: 1000,
                },
            ),

            new SingleStyleImpl(
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
        new SingleStyleImpl('borderColor', '', 'Border', StyleType.Color),
        [
            new SingleStyleImpl('borderWidth', '', 'Width', StyleType.Number, {
                units: ELEMENT_STYLE_UNITS,
                max: 1000,
            }),
            new SingleStyleImpl('borderStyle', '', 'Style', StyleType.Select, {
                options: ['solid', 'dotted', 'dashed'],
            }),
        ],
    ),
];

export const TextGroup = [
    new SingleStyleImpl('color', '#000000', 'Color', StyleType.Color),

    new SingleStyleImpl(
        'fontSize',
        '16px',
        'Size',
        StyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        },
    ),
    new SingleStyleImpl(
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
    new SingleStyleImpl(
        'letterSpacing',
        '0px',
        'Letter',
        StyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 100,
        },
    ),
    new SingleStyleImpl(
        'lineHeight',
        '100%',
        'Line Height',
        StyleType.Number,

        {
            units: ['%', 'px'],
            max: 1000,
        },
    ),
    new SingleStyleImpl(
        'textAlign',
        'start',
        'Align',
        StyleType.Select,

        {
            options: ['start', 'center', 'end'],
        },
    ),
];
