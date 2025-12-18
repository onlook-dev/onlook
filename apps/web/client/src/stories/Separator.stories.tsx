import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Separator } from '@onlook/ui/separator';

const meta = {
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      description: 'The orientation of the separator',
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
    },
    decorative: {
      description: 'Whether the separator is purely decorative',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
};

export const Horizontal: Story = {
  render: () => (
    <div className="w-[320px]">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Radix Primitives</h4>
        <p className="text-sm text-muted-foreground">
          An open-source UI component library.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center space-x-4 text-sm">
      <div>Blog</div>
      <Separator orientation="vertical" />
      <div>Docs</div>
      <Separator orientation="vertical" />
      <div>Source</div>
    </div>
  ),
};

export const InList: Story = {
  render: () => (
    <div className="w-[320px]">
      <div className="py-2">
        <div className="text-sm font-medium">Item 1</div>
        <div className="text-sm text-muted-foreground">Description for item 1</div>
      </div>
      <Separator />
      <div className="py-2">
        <div className="text-sm font-medium">Item 2</div>
        <div className="text-sm text-muted-foreground">Description for item 2</div>
      </div>
      <Separator />
      <div className="py-2">
        <div className="text-sm font-medium">Item 3</div>
        <div className="text-sm text-muted-foreground">Description for item 3</div>
      </div>
    </div>
  ),
};

export const InNavigation: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm">
      <a href="#" className="text-foreground hover:underline">Home</a>
      <Separator orientation="vertical" className="h-4" />
      <a href="#" className="text-foreground hover:underline">Products</a>
      <Separator orientation="vertical" className="h-4" />
      <a href="#" className="text-foreground hover:underline">About</a>
      <Separator orientation="vertical" className="h-4" />
      <a href="#" className="text-foreground hover:underline">Contact</a>
    </div>
  ),
};
