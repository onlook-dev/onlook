import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Progress } from '@onlook/ui/progress';

/**
 * Progress displays the completion status of a task or process.
 */
const meta = {
    title: 'UI/Progress',
    component: Progress,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="w-[320px]">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        value: {
            description: 'Progress value (0-100)',
            control: { type: 'range', min: 0, max: 100, step: 1 },
        },
    },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default progress at 0%
 */
export const Default: Story = {
    args: {
        value: 0,
    },
};

/**
 * Progress at 25%
 */
export const Quarter: Story = {
    args: {
        value: 25,
    },
};

/**
 * Progress at 50%
 */
export const Half: Story = {
    args: {
        value: 50,
    },
};

/**
 * Progress at 75%
 */
export const ThreeQuarters: Story = {
    args: {
        value: 75,
    },
};

/**
 * Progress at 100%
 */
export const Complete: Story = {
    args: {
        value: 100,
    },
};

/**
 * Progress with label
 */
export const WithLabel: Story = {
    render: () => (
        <div className="space-y-2 w-[320px]">
            <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>66%</span>
            </div>
            <Progress value={66} />
        </div>
    ),
};

/**
 * Multiple progress bars
 */
export const MultipleProgress: Story = {
    render: () => (
        <div className="space-y-4 w-[320px]">
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>HTML</span>
                    <span>90%</span>
                </div>
                <Progress value={90} />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>CSS</span>
                    <span>75%</span>
                </div>
                <Progress value={75} />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>JavaScript</span>
                    <span>60%</span>
                </div>
                <Progress value={60} />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>React</span>
                    <span>45%</span>
                </div>
                <Progress value={45} />
            </div>
        </div>
    ),
};

/**
 * All progress states
 */
export const AllStates: Story = {
    render: () => (
        <div className="space-y-4 w-[320px]">
            <div className="space-y-1">
                <span className="text-sm">0%</span>
                <Progress value={0} />
            </div>
            <div className="space-y-1">
                <span className="text-sm">25%</span>
                <Progress value={25} />
            </div>
            <div className="space-y-1">
                <span className="text-sm">50%</span>
                <Progress value={50} />
            </div>
            <div className="space-y-1">
                <span className="text-sm">75%</span>
                <Progress value={75} />
            </div>
            <div className="space-y-1">
                <span className="text-sm">100%</span>
                <Progress value={100} />
            </div>
        </div>
    ),
};
