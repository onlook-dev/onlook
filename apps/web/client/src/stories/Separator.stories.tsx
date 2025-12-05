import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Separator } from '@onlook/ui/separator';

/**
 * Separator visually divides content into distinct sections.
 */
const meta = {
    title: 'UI/Separator',
    component: Separator,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        orientation: {
            description: 'Orientation of the separator',
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

/**
 * Default horizontal separator
 */
export const Default: Story = {
    decorators: [
        (Story) => (
            <div className="w-[300px]">
                <Story />
            </div>
        ),
    ],
    args: {
        orientation: 'horizontal',
    },
};

/**
 * Vertical separator
 */
export const Vertical: Story = {
    decorators: [
        (Story) => (
            <div className="h-[100px]">
                <Story />
            </div>
        ),
    ],
    args: {
        orientation: 'vertical',
    },
};

/**
 * Separator between text sections
 */
export const BetweenText: Story = {
    render: () => (
        <div className="w-[300px]">
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

/**
 * Separator in a list
 */
export const InList: Story = {
    render: () => (
        <div className="w-[300px] space-y-4">
            <div className="flex items-center justify-between">
                <span>Item 1</span>
                <span className="text-muted-foreground">Value 1</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
                <span>Item 2</span>
                <span className="text-muted-foreground">Value 2</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
                <span>Item 3</span>
                <span className="text-muted-foreground">Value 3</span>
            </div>
        </div>
    ),
};

/**
 * Separator with label
 */
export const WithLabel: Story = {
    render: () => (
        <div className="w-[300px]">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>
        </div>
    ),
};

/**
 * Vertical separators in a toolbar
 */
export const Toolbar: Story = {
    render: () => (
        <div className="flex h-10 items-center space-x-4 rounded-md border px-4">
            <button className="text-sm">Cut</button>
            <Separator orientation="vertical" className="h-6" />
            <button className="text-sm">Copy</button>
            <Separator orientation="vertical" className="h-6" />
            <button className="text-sm">Paste</button>
        </div>
    ),
};

/**
 * Both orientations
 */
export const BothOrientations: Story = {
    render: () => (
        <div className="flex flex-col gap-8">
            <div className="w-[300px]">
                <p className="text-sm text-muted-foreground mb-2">Horizontal</p>
                <Separator />
            </div>
            <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">Vertical</p>
                <Separator orientation="vertical" className="h-8" />
                <p className="text-sm">Content</p>
            </div>
        </div>
    ),
};
