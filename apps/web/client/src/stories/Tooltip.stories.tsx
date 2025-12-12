import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tooltip, TooltipTrigger, TooltipContent } from '@onlook/ui/tooltip';
import { Button } from '@onlook/ui/button';
import { Plus, Settings, Trash2, Info } from 'lucide-react';

const meta = {
    component: Tooltip,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        delayDuration: {
            description: 'Delay before tooltip appears (ms)',
            control: 'number',
        },
    },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>This is a tooltip</p>
            </TooltipContent>
        </Tooltip>
    ),
};

export const WithDelay: Story = {
    render: () => (
        <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
                <Button variant="outline">Hover (500ms delay)</Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Tooltip with delay</p>
            </TooltipContent>
        </Tooltip>
    ),
};

export const Positions: Story = {
    render: () => (
        <div className="flex gap-4">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Top</Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p>Top tooltip</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Bottom</Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>Bottom tooltip</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Left</Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>Left tooltip</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Right</Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>Right tooltip</p>
                </TooltipContent>
            </Tooltip>
        </div>
    ),
};

export const IconButtons: Story = {
    render: () => (
        <div className="flex gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Add new item</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button size="icon" variant="outline">
                        <Settings className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Settings</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button size="icon" variant="outline">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Delete</p>
                </TooltipContent>
            </Tooltip>
        </div>
    ),
};

export const WithoutArrow: Story = {
    render: () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline">
                    <Info className="h-4 w-4 mr-2" />
                    No arrow
                </Button>
            </TooltipTrigger>
            <TooltipContent hideArrow>
                <p>Tooltip without arrow</p>
            </TooltipContent>
        </Tooltip>
    ),
};
