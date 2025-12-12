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
            description: 'Orientation of the separator',
            control: { type: 'select' },
            options: ['horizontal', 'vertical'],
        },
        decorative: {
            description: 'Whether the separator is decorative',
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
            <div className="py-2">Item 1</div>
            <Separator />
            <div className="py-2">Item 2</div>
            <Separator />
            <div className="py-2">Item 3</div>
            <Separator />
            <div className="py-2">Item 4</div>
        </div>
    ),
};
