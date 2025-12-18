import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Toggle } from '@onlook/ui/toggle';
import { Bold, Italic, Underline } from 'lucide-react';

const meta = {
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      description: 'Visual style variant',
      control: { type: 'select' },
      options: ['default', 'outline'],
    },
    size: {
      description: 'Size of the toggle',
      control: { type: 'select' },
      options: ['sm', 'default', 'lg'],
    },
    pressed: {
      description: 'Whether the toggle is pressed',
      control: 'boolean',
    },
    disabled: {
      description: 'Whether the toggle is disabled',
      control: 'boolean',
    },
  },
  args: {
    onPressedChange: fn(),
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Toggle',
    variant: 'default',
    size: 'default',
  },
};

export const Pressed: Story = {
  args: {
    children: 'Pressed',
    pressed: true,
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

export const WithIcon: Story = {
  render: () => (
    <Toggle aria-label="Toggle bold">
      <Bold className="size-4" />
    </Toggle>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Toggle variant="default">Default</Toggle>
      <Toggle variant="outline">Outline</Toggle>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle size="sm">Small</Toggle>
      <Toggle size="default">Default</Toggle>
      <Toggle size="lg">Large</Toggle>
    </div>
  ),
};

export const TextFormatting: Story = {
  render: () => (
    <div className="flex gap-1">
      <Toggle aria-label="Toggle bold" variant="outline">
        <Bold className="size-4" />
      </Toggle>
      <Toggle aria-label="Toggle italic" variant="outline">
        <Italic className="size-4" />
      </Toggle>
      <Toggle aria-label="Toggle underline" variant="outline">
        <Underline className="size-4" />
      </Toggle>
    </div>
  ),
};
