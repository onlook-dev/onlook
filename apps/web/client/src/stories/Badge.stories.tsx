import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from '@onlook/ui/badge';
import { Check, AlertCircle, Info, Star } from 'lucide-react';

/**
 * Badge is a small status indicator component used to highlight information,
 * display counts, or show status. It supports multiple variants and can
 * include icons.
 */
const meta = {
  title: 'UI/Badge',
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
      description: 'Whether to render as a child component using Radix Slot',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default badge style
 */
export const Default: Story = {
  args: {
    children: 'Badge',
    variant: 'default',
  },
};

/**
 * Secondary badge style
 */
export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

/**
 * Destructive badge for errors or warnings
 */
export const Destructive: Story = {
  args: {
    children: 'Error',
    variant: 'destructive',
  },
};

/**
 * Outline badge style
 */
export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

/**
 * Badge with an icon
 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Check />
        Completed
      </>
    ),
    variant: 'default',
  },
};

/**
 * Badge showing a count
 */
export const Count: Story = {
  args: {
    children: '42',
    variant: 'secondary',
  },
};

/**
 * Badge as a link
 */
export const AsLink: Story = {
  args: {
    asChild: true,
    variant: 'default',
    children: <a href="#">Click me</a>,
  },
};

/**
 * All badge variants
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

/**
 * Badges with icons
 */
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="default">
        <Check />
        Success
      </Badge>
      <Badge variant="destructive">
        <AlertCircle />
        Error
      </Badge>
      <Badge variant="secondary">
        <Info />
        Info
      </Badge>
      <Badge variant="outline">
        <Star />
        Featured
      </Badge>
    </div>
  ),
};

/**
 * Status badges for different states
 */
export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="default">Active</Badge>
      <Badge variant="secondary">Pending</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="outline">Draft</Badge>
    </div>
  ),
};

/**
 * Badges with different content lengths
 */
export const ContentLengths: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <Badge>1</Badge>
      <Badge>New</Badge>
      <Badge>In Progress</Badge>
      <Badge>Awaiting Review</Badge>
    </div>
  ),
};

/**
 * Badges used in a list context
 */
export const InContext: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
        <span className="text-sm">Messages</span>
        <Badge variant="default">5</Badge>
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
        <span className="text-sm">Notifications</span>
        <Badge variant="destructive">12</Badge>
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
        <span className="text-sm">Updates</span>
        <Badge variant="secondary">3</Badge>
      </div>
    </div>
  ),
};
