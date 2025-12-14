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
      options: ['default', 'sm', 'lg'],
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
  render: () => (
    <Toggle aria-label="Toggle bold">
      <Bold className="h-4 w-4" />
    </Toggle>
  ),
};

export const Outline: Story = {
  render: () => (
    <Toggle variant="outline" aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
    </Toggle>
  ),
};

export const WithText: Story = {
  render: () => (
    <Toggle aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
      Italic
    </Toggle>
  ),
};

export const Pressed: Story = {
  render: () => (
    <Toggle defaultPressed aria-label="Toggle bold">
      <Bold className="h-4 w-4" />
    </Toggle>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Toggle disabled aria-label="Toggle underline">
      <Underline className="h-4 w-4" />
    </Toggle>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle size="sm" aria-label="Toggle small">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle size="default" aria-label="Toggle default">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle size="lg" aria-label="Toggle large">
        <Bold className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};

export const TextFormatting: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Toggle aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Toggle underline">
        <Underline className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};
