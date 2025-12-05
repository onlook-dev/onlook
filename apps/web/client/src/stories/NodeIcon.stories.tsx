import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NodeIcon } from '@onlook/ui/node-icon';

/**
 * NodeIcon displays an appropriate icon based on the HTML tag name.
 * It maps common HTML elements to their corresponding visual icons,
 * making it easier to identify element types in the layers panel.
 */
const meta = {
  title: 'UI/NodeIcon',
  component: NodeIcon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    iconClass: {
      description: 'CSS classes to apply to the icon',
      control: 'text',
    },
    tagName: {
      description: 'HTML tag name to display icon for',
      control: 'text',
    },
  },
  args: {
    iconClass: 'w-4 h-4',
    tagName: 'div',
  },
} satisfies Meta<typeof NodeIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default div element icon
 */
export const Default: Story = {
  args: {
    iconClass: 'w-4 h-4',
    tagName: 'div',
  },
};

/**
 * Heading elements (H1-H6)
 */
export const Headings: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 items-center">
      {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => (
        <div key={tag} className="flex flex-col items-center gap-2">
          <NodeIcon iconClass="w-5 h-5" tagName={tag} />
          <span className="text-xs text-muted-foreground uppercase">{tag}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * Text elements
 */
export const TextElements: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 items-center">
      {['p', 'span', 'strong', 'em', 'i'].map((tag) => (
        <div key={tag} className="flex flex-col items-center gap-2">
          <NodeIcon iconClass="w-5 h-5" tagName={tag} />
          <span className="text-xs text-muted-foreground uppercase">{tag}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * Media elements
 */
export const MediaElements: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 items-center">
      {['img', 'svg', 'video', 'iframe', 'canvas'].map((tag) => (
        <div key={tag} className="flex flex-col items-center gap-2">
          <NodeIcon iconClass="w-5 h-5" tagName={tag} />
          <span className="text-xs text-muted-foreground uppercase">{tag}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * Interactive elements
 */
export const InteractiveElements: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 items-center">
      {['button', 'a', 'input', 'select', 'textarea'].map((tag) => (
        <div key={tag} className="flex flex-col items-center gap-2">
          <NodeIcon iconClass="w-5 h-5" tagName={tag} />
          <span className="text-xs text-muted-foreground uppercase">{tag}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * Layout elements
 */
export const LayoutElements: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 items-center">
      {['div', 'section', 'form', 'ul', 'ol'].map((tag) => (
        <div key={tag} className="flex flex-col items-center gap-2">
          <NodeIcon iconClass="w-5 h-5" tagName={tag} />
          <span className="text-xs text-muted-foreground uppercase">{tag}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * Table elements
 */
export const TableElements: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 items-center">
      {['table', 'thead', 'tbody', 'tr', 'th', 'td'].map((tag) => (
        <div key={tag} className="flex flex-col items-center gap-2">
          <NodeIcon iconClass="w-5 h-5" tagName={tag} />
          <span className="text-xs text-muted-foreground uppercase">{tag}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * Special elements
 */
export const SpecialElements: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 items-center">
      {['body', 'component'].map((tag) => (
        <div key={tag} className="flex flex-col items-center gap-2">
          <NodeIcon iconClass="w-5 h-5" tagName={tag} />
          <span className="text-xs text-muted-foreground uppercase">{tag}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * Different icon sizes
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-2">
        <NodeIcon iconClass="w-3 h-3" tagName="div" />
        <span className="text-xs text-muted-foreground">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <NodeIcon iconClass="w-4 h-4" tagName="div" />
        <span className="text-xs text-muted-foreground">Default</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <NodeIcon iconClass="w-5 h-5" tagName="div" />
        <span className="text-xs text-muted-foreground">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <NodeIcon iconClass="w-6 h-6" tagName="div" />
        <span className="text-xs text-muted-foreground">Large</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <NodeIcon iconClass="w-8 h-8" tagName="div" />
        <span className="text-xs text-muted-foreground">XL</span>
      </div>
    </div>
  ),
};

/**
 * With custom colors
 */
export const CustomColors: Story = {
  render: () => (
    <div className="flex gap-6 items-center">
      <NodeIcon iconClass="w-5 h-5 text-blue-500" tagName="div" />
      <NodeIcon iconClass="w-5 h-5 text-green-500" tagName="button" />
      <NodeIcon iconClass="w-5 h-5 text-purple-500" tagName="img" />
      <NodeIcon iconClass="w-5 h-5 text-orange-500" tagName="a" />
      <NodeIcon iconClass="w-5 h-5 text-red-500" tagName="form" />
    </div>
  ),
};

/**
 * All supported elements
 */
export const AllElements: Story = {
  render: () => {
    const allTags = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span', 'strong', 'em', 'i',
      'a', 'button', 'input', 'select', 'option', 'textarea',
      'img', 'svg', 'video', 'iframe', 'canvas',
      'div', 'section', 'form', 'ul', 'ol',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'body', 'component',
    ];

    return (
      <div className="grid grid-cols-8 gap-4">
        {allTags.map((tag) => (
          <div key={tag} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-secondary">
            <NodeIcon iconClass="w-5 h-5" tagName={tag} />
            <span className="text-[10px] text-muted-foreground uppercase">{tag}</span>
          </div>
        ))}
      </div>
    );
  },
};

/**
 * In a layers panel context
 */
export const InLayersPanel: Story = {
  render: () => {
    const layers = [
      { tag: 'div', name: 'Container', indent: 0 },
      { tag: 'section', name: 'Hero', indent: 1 },
      { tag: 'h1', name: 'Title', indent: 2 },
      { tag: 'p', name: 'Description', indent: 2 },
      { tag: 'button', name: 'CTA Button', indent: 2 },
      { tag: 'section', name: 'Features', indent: 1 },
      { tag: 'div', name: 'Feature Card', indent: 2 },
      { tag: 'img', name: 'Icon', indent: 3 },
      { tag: 'h3', name: 'Feature Title', indent: 3 },
    ];

    return (
      <div className="w-64 rounded-lg border border-border bg-background p-2">
        {layers.map((layer, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer"
            style={{ paddingLeft: `${8 + layer.indent * 16}px` }}
          >
            <NodeIcon iconClass="w-4 h-4 text-muted-foreground" tagName={layer.tag} />
            <span className="text-sm truncate">{layer.name}</span>
          </div>
        ))}
      </div>
    );
  },
};
