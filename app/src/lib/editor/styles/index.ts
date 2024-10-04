import { LayoutMode } from './autolayout';
import { ElementStyle, ElementStyleOptions, ElementStyleType } from './models';
import { ELEMENT_STYLE_UNITS } from './units';

class ElementStyleImpl implements ElementStyle {
    constructor(
        public readonly key: string,
        public readonly defaultValue: string,
        public readonly displayName: string,
        public readonly type: ElementStyleType,
        public readonly option?: ElementStyleOptions,
    ) {}
}

export const ELEMENT_STYLES: ElementStyle[] = [
    new ElementStyleImpl('width', '', 'Width', ElementStyleType.Dimensions, {
        units: Object.values(LayoutMode),
        max: 1000,
    }),
    new ElementStyleImpl('height', '', 'Height', ElementStyleType.Dimensions, {
        units: Object.values(LayoutMode),
        max: 1000,
    }),

    // Layout
    new ElementStyleImpl('display', 'flex', 'Type', ElementStyleType.Select, {
        selectValues: ['block', 'flex', 'grid'],
    }),

    new ElementStyleImpl('flexDirection', 'row', 'Direction', ElementStyleType.Select, {
        selectValues: ['row', 'column'],
    }),

    new ElementStyleImpl('justifyContent', 'flex-start', 'Justify', ElementStyleType.Select, {
        selectValues: ['flex-start', 'center', 'flex-end', 'space-between'],
    }),
    new ElementStyleImpl('alignItems', 'flex-start', 'Align', ElementStyleType.Select, {
        selectValues: ['flex-start', 'center', 'flex-end', 'space-between'],
    }),

    new ElementStyleImpl('gridTemplateColumns', '', 'Columns', ElementStyleType.Text),

    new ElementStyleImpl('gridTemplateRows', '', 'Rows', ElementStyleType.Text),

    new ElementStyleImpl('gap', '0px', 'Gap', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('margin', '', 'Margin', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('marginLeft', '', 'Left', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('marginTop', '', 'Top', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('marginRight', '', 'Right', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('marginBottom', '', 'Bottom', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('padding', '', 'Padding', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('paddingLeft', '', 'Left', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('paddingTop', '', 'Top', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),
    new ElementStyleImpl('paddingRight', '', 'Right', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('paddingBottom', '', 'Bottom', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    // Style
    new ElementStyleImpl('opacity', '100', 'Opacity', ElementStyleType.Number, {
        units: ['%'],
        max: 100,
    }),

    new ElementStyleImpl('backgroundColor', '', 'Background', ElementStyleType.Color),

    new ElementStyleImpl('borderRadius', '', 'Corners', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl(
        'borderTopLeftRadius',
        '',
        'Top Left',
        ElementStyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        },
    ),

    new ElementStyleImpl(
        'borderTopRightRadius',
        '',
        'Top Right',
        ElementStyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        },
    ),

    new ElementStyleImpl(
        'borderBottomLeftRadius',
        '',
        'Bottom Left',
        ElementStyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        },
    ),

    new ElementStyleImpl(
        'borderBottomRightRadius',
        '',
        'Bottom Right',
        ElementStyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        },
    ),

    new ElementStyleImpl('borderColor', '', 'Border', ElementStyleType.Color),

    new ElementStyleImpl('borderWidth', '', 'Width', ElementStyleType.Number, {
        units: ELEMENT_STYLE_UNITS,
        max: 1000,
    }),

    new ElementStyleImpl('borderStyle', '', 'Style', ElementStyleType.Select, {
        selectValues: ['solid', 'dotted', 'dashed'],
    }),

    // Text
    new ElementStyleImpl('color', '#000000', 'Color', ElementStyleType.Color),

    new ElementStyleImpl(
        'fontSize',
        '16px',
        'Size',
        ElementStyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 1000,
        },
    ),
    new ElementStyleImpl(
        'fontWeight',
        'normal',
        'Weight',
        ElementStyleType.Select,

        {
            selectValues: [
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
    new ElementStyleImpl(
        'letterSpacing',
        '0px',
        'Letter',
        ElementStyleType.Number,

        {
            units: ELEMENT_STYLE_UNITS,
            max: 100,
        },
    ),
    new ElementStyleImpl(
        'lineHeight',
        '100%',
        'Line Height',
        ElementStyleType.Number,

        {
            units: ['%', 'px'],
            max: 1000,
        },
    ),
    new ElementStyleImpl(
        'textAlign',
        'start',
        'Align',
        ElementStyleType.Select,

        {
            selectValues: ['start', 'center', 'end'],
        },
    ),
];
