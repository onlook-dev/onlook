import { LayoutMode } from "./autolayout"
import { ElementStyle, ElementStyleGroup, ElementStyleSubGroup, ElementStyleType } from "./models"
import { ELEMENT_STYLE_UNITS } from "./units"

class ElementStyleImpl implements ElementStyle {
  constructor(
    key: string,
    value: string,
    displayName: string,
    type: ElementStyleType,
    group: ElementStyleGroup,

    // Optional
    optional?: {
      options?: string[],
      units?: string[],
      max?: number,
      subGroup?: ElementStyleSubGroup
    }
  ) {
    this.key = key
    this.value = value
    this.displayName = displayName
    this.type = type
    this.group = group

    if (!optional) return
    this.options = optional.options || []
    this.units = optional.units
    this.max = optional.max
    this.subGroup = optional.subGroup
  }
  key: string
  value: string
  displayName: string
  type: ElementStyleType
  group: ElementStyleGroup
  options?: string[] | undefined
  units?: string[] | undefined
  max?: number | undefined
  subGroup?: ElementStyleSubGroup | undefined
}

export const ELEMENT_STYLES: ElementStyle[] = [
  // Position & Dimenions
  new ElementStyleImpl(
    'width',
    '',
    'Width',
    ElementStyleType.Dimensions,
    ElementStyleGroup.Position,
    {
      units: Object.values(LayoutMode),
      max: 1000
    }
  ),
  new ElementStyleImpl(
    'height',
    '',
    'Height',
    ElementStyleType.Dimensions,
    ElementStyleGroup.Position,
    {
      units: Object.values(LayoutMode),
      max: 1000
    }
  ),

  // Layout
  new ElementStyleImpl(
    'display',
    'flex',
    'Type',
    ElementStyleType.Select,
    ElementStyleGroup.Layout,
    {
      options: ['block', 'flex', 'grid'],
      subGroup: ElementStyleSubGroup.Display
    }
  ),

  new ElementStyleImpl(
    'flexDirection',
    'row',
    'Direction',
    ElementStyleType.Select,
    ElementStyleGroup.Layout,
    { options: ['row', 'column'], subGroup: ElementStyleSubGroup.Display }
  ),

  new ElementStyleImpl(
    'justifyContent',
    'flex-start',
    'X Align',
    ElementStyleType.Select,
    ElementStyleGroup.Layout,
    { options: ['flex-start', 'center', 'flex-end', 'space-between'], subGroup: ElementStyleSubGroup.Display }
  ),
  new ElementStyleImpl(
    'alignItems',
    'flex-start',
    'Y Align',
    ElementStyleType.Select,
    ElementStyleGroup.Layout,
    { options: ['flex-start', 'center', 'flex-end', 'space-between'], subGroup: ElementStyleSubGroup.Display }
  ),

  new ElementStyleImpl(
    'gridTemplateColumns',
    '',
    'Columns',
    ElementStyleType.Text,
    ElementStyleGroup.Layout,
    { subGroup: ElementStyleSubGroup.Display }
  ),

  new ElementStyleImpl(
    'gridTemplateRows',
    '',
    'Rows',
    ElementStyleType.Text,
    ElementStyleGroup.Layout,
    { subGroup: ElementStyleSubGroup.Display }
  ),

  new ElementStyleImpl(
    'gap',
    '0px',
    'Gap',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Display
    }
  ),

  new ElementStyleImpl(
    'margin',
    '',
    'Margin',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),

  new ElementStyleImpl(
    'marginLeft',
    '',
    'Left',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),

  new ElementStyleImpl(
    'marginTop',
    '',
    'Top',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),

  new ElementStyleImpl(
    'marginRight',
    '',
    'Right',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),

  new ElementStyleImpl(
    'marginBottom',
    '',
    'Bottom',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),


  new ElementStyleImpl(
    'padding',
    '',
    'Padding',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),

  new ElementStyleImpl(
    'paddingLeft',
    '',
    'Left',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),

  new ElementStyleImpl(
    'paddingTop',
    '',
    'Top',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),
  new ElementStyleImpl(
    'paddingRight',
    '',
    'Right',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),

  new ElementStyleImpl(
    'paddingBottom',
    '',
    'Bottom',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),

  // Style
  new ElementStyleImpl(
    'opacity',
    '100',
    'Opacity',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: ['%'],
      max: 100
    }
  ),

  new ElementStyleImpl(
    'backgroundColor',
    '',
    'Fill',
    ElementStyleType.Color,
    ElementStyleGroup.Style
  ),


  new ElementStyleImpl(
    'borderRadius',
    '',
    'Corners',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyleImpl(
    'borderTopLeftRadius',
    '',
    'Top Left',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyleImpl(
    'borderTopRightRadius',
    '',
    'Top Right',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyleImpl(
    'borderBottomLeftRadius',
    '',
    'Bottom Left',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyleImpl(
    'borderBottomRightRadius',
    '',
    'Bottom Right',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyleImpl(
    'borderColor',
    '',
    'Border',
    ElementStyleType.Color,
    ElementStyleGroup.Style,
    {
      subGroup: ElementStyleSubGroup.Border
    }
  ),

  new ElementStyleImpl(
    'borderWidth',
    '',
    'Width',
    ElementStyleType.Text,
    ElementStyleGroup.Style,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000,
      subGroup: ElementStyleSubGroup.Border
    }
  ),

  new ElementStyleImpl(
    'borderStyle',
    '',
    'Style',
    ElementStyleType.Select,
    ElementStyleGroup.Style,
    {
      options: ['solid', 'dotted', 'dashed'],
      subGroup: ElementStyleSubGroup.Border
    }
  ),

  // Text
  new ElementStyleImpl(
    'color',
    '#000000',
    'Color',
    ElementStyleType.Color,
    ElementStyleGroup.Text
  ),

  new ElementStyleImpl(
    'fontSize',
    '16px',
    'Size',
    ElementStyleType.Number,
    ElementStyleGroup.Text,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 1000
    }
  ),
  new ElementStyleImpl(
    'fontWeight',
    'normal',
    'Weight',
    ElementStyleType.Select,
    ElementStyleGroup.Text,
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
        '900'
      ]
    }
  ),
  new ElementStyleImpl(
    'letterSpacing',
    '0px',
    'Letter',
    ElementStyleType.Number,
    ElementStyleGroup.Text,
    {
      units: ELEMENT_STYLE_UNITS,
      max: 100
    }
  ),
  new ElementStyleImpl(
    'lineHeight',
    '100%',
    'Line Height',
    ElementStyleType.Number,
    ElementStyleGroup.Text,
    {
      units: ['%', 'px'],
      max: 1000
    }
  ),
  new ElementStyleImpl(
    'textAlign',
    'start',
    'Align',
    ElementStyleType.Select,
    ElementStyleGroup.Text,
    {
      options: ['start', 'center', 'end']
    }
  ),
]
