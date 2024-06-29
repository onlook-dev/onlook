import { LayoutMode } from "./autolayout"
import { elementStyleUnits } from "./units"

export interface ElementStyle {
  key: string
  value: string
  displayName: string
  type: ElementStyleType
  group: ElementStyleGroup

  // Optional depending on types
  options?: string[]
  units?: string[]
  max?: number
  subGroup?: ElementStyleSubGroup
}

export enum ElementStyleType {
  Text = 'text',
  Dimensions = 'dimensions',
  Number = 'number',
  Select = 'select',
  Color = 'color'
}

export enum ElementStyleGroup {
  Size = 'Size',
  Position = 'Position & Dimensions',
  Layout = 'Layout',
  Style = 'Styles',
  Text = 'Text',
  Effects = 'Effects',
}

export enum ElementStyleSubGroup {
  Corners = 'Corners',
  Margin = 'Margin',
  Padding = 'Padding',
  Border = 'Border',
  Shadow = 'Shadow',
  Display = 'Display'
}

// Custom order for the groups
const groupOrder: (string)[] = [
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

export class ElementStyle implements ElementStyle {

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
}

// https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units

// Position: height, width
// Layout: type, direction, distribute, X align, Y align, Gap, Padding, Margin
// Style: opacity, fill (backgroundColor), Corners (cornerRadius and for each corner), Borders (border color, border weight), Position, Shadows (same as border)
// Text: color fontSize fontWeight letterSpacing lineHeight textAlign 
// Effect: shadow border

export const elementStyles: ElementStyle[] = [
  // Position & Dimenions
  new ElementStyle(
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
  new ElementStyle(
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
  new ElementStyle(
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

  new ElementStyle(
    'flexDirection',
    'row',
    'Direction',
    ElementStyleType.Select,
    ElementStyleGroup.Layout,
    { options: ['row', 'column'], subGroup: ElementStyleSubGroup.Display }
  ),

  new ElementStyle(
    'justifyContent',
    'flex-start',
    'X Align',
    ElementStyleType.Select,
    ElementStyleGroup.Layout,
    { options: ['flex-start', 'center', 'flex-end', 'space-between'], subGroup: ElementStyleSubGroup.Display }
  ),
  new ElementStyle(
    'alignItems',
    'flex-start',
    'Y Align',
    ElementStyleType.Select,
    ElementStyleGroup.Layout,
    { options: ['flex-start', 'center', 'flex-end', 'space-between'], subGroup: ElementStyleSubGroup.Display }
  ),

  new ElementStyle(
    'gridTemplateColumns',
    '',
    'Columns',
    ElementStyleType.Text,
    ElementStyleGroup.Layout,
    { subGroup: ElementStyleSubGroup.Display }
  ),

  new ElementStyle(
    'gridTemplateRows',
    '',
    'Rows',
    ElementStyleType.Text,
    ElementStyleGroup.Layout,
    { subGroup: ElementStyleSubGroup.Display }
  ),

  new ElementStyle(
    'gap',
    '0px',
    'Gap',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Display
    }
  ),

  new ElementStyle(
    'margin',
    '',
    'Margin',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),

  new ElementStyle(
    'marginLeft',
    '',
    'Left',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),

  new ElementStyle(
    'marginTop',
    '',
    'Top',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),

  new ElementStyle(
    'marginRight',
    '',
    'Right',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),

  new ElementStyle(
    'marginBottom',
    '',
    'Bottom',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Margin
    }
  ),


  new ElementStyle(
    'padding',
    '',
    'Padding',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),

  new ElementStyle(
    'paddingLeft',
    '',
    'Left',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),

  new ElementStyle(
    'paddingTop',
    '',
    'Top',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),
  new ElementStyle(
    'paddingRight',
    '',
    'Right',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),

  new ElementStyle(
    'paddingBottom',
    '',
    'Bottom',
    ElementStyleType.Number,
    ElementStyleGroup.Layout,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Padding
    }
  ),

  // Style
  new ElementStyle(
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

  new ElementStyle(
    'backgroundColor',
    '',
    'Fill',
    ElementStyleType.Color,
    ElementStyleGroup.Style
  ),


  new ElementStyle(
    'borderRadius',
    '',
    'Corners',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyle(
    'borderTopLeftRadius',
    '',
    'Top Left',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyle(
    'borderTopRightRadius',
    '',
    'Top Right',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyle(
    'borderBottomLeftRadius',
    '',
    'Bottom Left',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyle(
    'borderBottomRightRadius',
    '',
    'Bottom Right',
    ElementStyleType.Number,
    ElementStyleGroup.Style,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Corners
    }
  ),

  new ElementStyle(
    'borderColor',
    '',
    'Border',
    ElementStyleType.Color,
    ElementStyleGroup.Style,
    {
      subGroup: ElementStyleSubGroup.Border
    }
  ),

  // TODO: Why isn't this a unit type?
  new ElementStyle(
    'borderWidth',
    '',
    'Width',
    ElementStyleType.Text,
    ElementStyleGroup.Style,
    {
      units: elementStyleUnits,
      max: 1000,
      subGroup: ElementStyleSubGroup.Border
    }
  ),

  new ElementStyle(
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
  new ElementStyle(
    'color',
    '#000000',
    'Color',
    ElementStyleType.Color,
    ElementStyleGroup.Text
  ),

  new ElementStyle(
    'fontSize',
    '16px',
    'Size',
    ElementStyleType.Number,
    ElementStyleGroup.Text,
    {
      units: elementStyleUnits,
      max: 1000
    }
  ),
  new ElementStyle(
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
  new ElementStyle(
    'letterSpacing',
    '0px',
    'Letter',
    ElementStyleType.Number,
    ElementStyleGroup.Text,
    {
      units: elementStyleUnits,
      max: 100
    }
  ),
  new ElementStyle(
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
  new ElementStyle(
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

export function sortGroupsByCustomOrder(groups: Record<string, ElementStyle[]>): Record<string, ElementStyle[]> {
  const sortedGroups: Record<string, ElementStyle[]> = {};

  // Iterate through the groupOrder array to ensure custom order
  groupOrder.forEach(group => {
    if (groups[group]) { // Check if the group exists in the input groups
      sortedGroups[group] = groups[group];
    }
  });

  return sortedGroups;
}

export function groupElementStyles(styles: ElementStyle[]): Record<string, Record<string, ElementStyle[]>> {
  return styles.reduce((groups, style) => {
    // Check and initialize the main group if it doesn't exist
    if (!groups[style.group]) {
      groups[style.group] = {};
    }

    // Check and initialize the subgroup within the main group if it doesn't exist
    if (style.subGroup) {
      if (!groups[style.group][style.subGroup]) {
        groups[style.group][style.subGroup] = [];
      }
      // Add the style to the subgroup
      groups[style.group][style.subGroup].push(style);
    } else {
      // If no subgroup is specified, use a default key to store styles directly under the group
      const defaultKey = "default";
      if (!groups[style.group][defaultKey]) {
        groups[style.group][defaultKey] = [];
      }
      groups[style.group][defaultKey].push(style);
    }

    return sortGroupsByCustomOrder(groups);
  }, {});
}

export function getStyles(computedStyle: CSSStyleDeclaration): Record<string, Record<string, ElementStyle[]>> {
  const clonedElementStyles = JSON.parse(JSON.stringify(elementStyles))
  clonedElementStyles.forEach((style: any) => {
    style.value = computedStyle[style.key]
  })
  return groupElementStyles(clonedElementStyles)
}