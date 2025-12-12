import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Progress } from '@onlook/ui/progress';

const meta = {
    component: Progress,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        value: {
            description: 'Progress value (0-100)',
            control: { type: 'range', min: 0, max: 100, step: 1 },
        },
    },
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        value: 50,
    },
};

export const Empty: Story = {
    args: {
        value: 0,
    },
};

export const Quarter: Story = {
    args: {
        value: 25,
    },
};

export const Half: Story = {
    args: {
        value: 50,
    },
};

export const ThreeQuarters: Story = {
    args: {
        value: 75,
    },
};

export const Complete: Story = {
    args: {
        value: 100,
    },
};

export const ProgressSteps: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <div className="space-y-1">
                <div className="flex justify-between text-sm">
                    <span>0%</span>
                </div>
                <Progress value={0} />
            </div>
            <div className="space-y-1">
                <div className="flex justify-between text-sm">
                    <span>25%</span>
                </div>
                <Progress value={25} />
            </div>
            <div className="space-y-1">
                <div className="flex justify-between text-sm">
                    <span>50%</span>
                </div>
                <Progress value={50} />
            </div>
            <div className="space-y-1">
                <div className="flex justify-between text-sm">
                    <span>75%</span>
                </div>
                <Progress value={75} />
            </div>
            <div className="space-y-1">
                <div className="flex justify-between text-sm">
                    <span>100%</span>
                </div>
                <Progress value={100} />
            </div>
        </div>
    ),
};
