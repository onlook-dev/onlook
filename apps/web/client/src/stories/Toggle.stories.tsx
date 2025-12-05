import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Toggle } from '@onlook/ui/toggle';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

/**
 * Toggle is a two-state button that can be either on or off.
 */
const meta = {
    title: 'UI/Toggle',
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

/**
 * Default toggle
 */
export const Default: Story = {
    args: {
        children: <Bold className="size-4" />,
        'aria-label': 'Toggle bold',
    },
};

/**
 * Pressed toggle
 */
export const Pressed: Story = {
    args: {
        children: <Bold className="size-4" />,
        'aria-label': 'Toggle bold',
        pressed: true,
    },
};

/**
 * Outline variant
 */
export const Outline: Story = {
    args: {
        children: <Bold className="size-4" />,
        'aria-label': 'Toggle bold',
        variant: 'outline',
    },
};

/**
 * Disabled toggle
 */
export const Disabled: Story = {
    args: {
        children: <Bold className="size-4" />,
        'aria-label': 'Toggle bold',
        disabled: true,
    },
};

/**
 * Toggle with text
 */
export const WithText: Story = {
    args: {
        children: 'Toggle',
    },
};

/**
 * All sizes
 */
export const Sizes: Story = {
    render: () => (
        <div className="flex items-center gap-2">
            <Toggle size="sm" aria-label="Toggle small">
                <Bold className="size-4" />
            </Toggle>
            <Toggle size="default" aria-label="Toggle default">
                <Bold className="size-4" />
            </Toggle>
            <Toggle size="lg" aria-label="Toggle large">
                <Bold className="size-4" />
            </Toggle>
        </div>
    ),
};

/**
 * All variants
 */
export const Variants: Story = {
    render: () => (
        <div className="flex items-center gap-2">
            <Toggle variant="default" aria-label="Toggle default">
                <Bold className="size-4" />
            </Toggle>
            <Toggle variant="outline" aria-label="Toggle outline">
                <Bold className="size-4" />
            </Toggle>
        </div>
    ),
};

/**
 * Text formatting toolbar example
 */
export const TextFormattingToolbar: Story = {
    render: () => (
        <div className="flex items-center gap-1 rounded-md border p-1">
            <Toggle aria-label="Toggle bold" defaultPressed>
                <Bold className="size-4" />
            </Toggle>
            <Toggle aria-label="Toggle italic">
                <Italic className="size-4" />
            </Toggle>
            <Toggle aria-label="Toggle underline">
                <Underline className="size-4" />
            </Toggle>
            <div className="mx-1 h-6 w-px bg-border" />
            <Toggle aria-label="Align left" defaultPressed>
                <AlignLeft className="size-4" />
            </Toggle>
            <Toggle aria-label="Align center">
                <AlignCenter className="size-4" />
            </Toggle>
            <Toggle aria-label="Align right">
                <AlignRight className="size-4" />
            </Toggle>
        </div>
    ),
};

/**
 * All toggle states
 */
export const AllStates: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Toggle aria-label="Default">
                    <Bold className="size-4" />
                </Toggle>
                <span className="text-sm">Default</span>
            </div>
            <div className="flex items-center gap-2">
                <Toggle aria-label="Pressed" defaultPressed>
                    <Bold className="size-4" />
                </Toggle>
                <span className="text-sm">Pressed</span>
            </div>
            <div className="flex items-center gap-2">
                <Toggle aria-label="Disabled" disabled>
                    <Bold className="size-4" />
                </Toggle>
                <span className="text-sm text-muted-foreground">Disabled</span>
            </div>
            <div className="flex items-center gap-2">
                <Toggle aria-label="Disabled pressed" disabled defaultPressed>
                    <Bold className="size-4" />
                </Toggle>
                <span className="text-sm text-muted-foreground">Disabled Pressed</span>
            </div>
        </div>
    ),
};
