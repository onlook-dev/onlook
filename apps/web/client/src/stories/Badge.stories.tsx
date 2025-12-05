import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from '@onlook/ui/badge';
import { Check, AlertCircle, Clock, Star } from 'lucide-react';

/**
 * Badge displays a small status indicator or label with different visual variants.
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
            description: 'Whether to render as a child component',
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
 * Secondary badge variant
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
 * Outline badge variant
 */
export const Outline: Story = {
    args: {
        children: 'Outline',
        variant: 'outline',
    },
};

/**
 * Badge with icon
 */
export const WithIcon: Story = {
    render: () => (
        <Badge variant="default">
            <Check className="size-3" />
            Completed
        </Badge>
    ),
};

/**
 * All badge variants displayed together
 */
export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
        </div>
    ),
};

/**
 * Badges with different icons for various states
 */
export const WithIcons: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Badge variant="default">
                <Check className="size-3" />
                Success
            </Badge>
            <Badge variant="destructive">
                <AlertCircle className="size-3" />
                Error
            </Badge>
            <Badge variant="secondary">
                <Clock className="size-3" />
                Pending
            </Badge>
            <Badge variant="outline">
                <Star className="size-3" />
                Featured
            </Badge>
        </div>
    ),
};
