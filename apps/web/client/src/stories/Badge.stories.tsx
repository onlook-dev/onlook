import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from '@onlook/ui/badge';
import { CheckIcon, AlertCircleIcon, InfoIcon } from 'lucide-react';

const meta = {
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      description: 'Visual style variant of the badge',
      control: { type: 'select' },
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
    asChild: {
      description: 'Whether to render as a child component',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
    variant: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

export const WithIcon: Story = {
  render: () => (
    <Badge variant="default">
      <CheckIcon className="size-3" />
      Success
    </Badge>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="default">
        <CheckIcon className="size-3" />
        Success
      </Badge>
      <Badge variant="destructive">
        <AlertCircleIcon className="size-3" />
        Error
      </Badge>
      <Badge variant="secondary">
        <InfoIcon className="size-3" />
        Info
      </Badge>
    </div>
  ),
};
