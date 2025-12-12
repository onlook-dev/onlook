import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Slider } from '@onlook/ui/slider';

const meta = {
    component: Slider,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        min: {
            description: 'Minimum value',
            control: 'number',
        },
        max: {
            description: 'Maximum value',
            control: 'number',
        },
        step: {
            description: 'Step increment',
            control: 'number',
        },
        disabled: {
            description: 'Whether the slider is disabled',
            control: 'boolean',
        },
    },
    args: {
        onValueChange: fn(),
    },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        defaultValue: [50],
        min: 0,
        max: 100,
    },
};

export const WithStep: Story = {
    args: {
        defaultValue: [25],
        min: 0,
        max: 100,
        step: 25,
    },
};

export const Range: Story = {
    args: {
        defaultValue: [25, 75],
        min: 0,
        max: 100,
    },
};

export const Disabled: Story = {
    args: {
        defaultValue: [50],
        disabled: true,
    },
};

export const CustomRange: Story = {
    args: {
        defaultValue: [5],
        min: 0,
        max: 10,
        step: 1,
    },
};

export const Values: Story = {
    render: () => (
        <div className="flex flex-col gap-8">
            <div className="space-y-2">
                <div className="text-sm">0%</div>
                <Slider defaultValue={[0]} />
            </div>
            <div className="space-y-2">
                <div className="text-sm">50%</div>
                <Slider defaultValue={[50]} />
            </div>
            <div className="space-y-2">
                <div className="text-sm">100%</div>
                <Slider defaultValue={[100]} />
            </div>
            <div className="space-y-2">
                <div className="text-sm">Range (25-75)</div>
                <Slider defaultValue={[25, 75]} />
            </div>
        </div>
    ),
};
