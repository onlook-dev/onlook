import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tooltip, TooltipTrigger, TooltipContent } from '@onlook/ui/tooltip';
import { Button } from '@onlook/ui/button';
import { Plus, Settings, HelpCircle, Info } from 'lucide-react';

/**
 * Tooltip displays additional information when hovering over an element.
 */
const meta = {
    title: 'UI/Tooltip',
    component: Tooltip,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default tooltip
 */
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

/**
 * Tooltip on icon button
 */
export const IconButton: Story = {
    render: () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                    <Plus className="size-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Add new item</p>
            </TooltipContent>
        </Tooltip>
    ),
};

/**
 * Tooltip with different positions
 */
export const Positions: Story = {
    render: () => (
        <div className="flex items-center gap-8">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Top</Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p>Tooltip on top</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Right</Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>Tooltip on right</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Bottom</Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>Tooltip on bottom</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline">Left</Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>Tooltip on left</p>
                </TooltipContent>
            </Tooltip>
        </div>
    ),
};

/**
 * Tooltip without arrow
 */
export const WithoutArrow: Story = {
    render: () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline">No arrow</Button>
            </TooltipTrigger>
            <TooltipContent hideArrow>
                <p>Tooltip without arrow</p>
            </TooltipContent>
        </Tooltip>
    ),
};

/**
 * Tooltip with delay
 */
export const WithDelay: Story = {
    render: () => (
        <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
                <Button variant="outline">Delayed (500ms)</Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>This tooltip has a 500ms delay</p>
            </TooltipContent>
        </Tooltip>
    ),
};

/**
 * Tooltip on text
 */
export const OnText: Story = {
    render: () => (
        <p className="text-sm">
            Hover over the{' '}
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="underline decoration-dotted cursor-help">highlighted text</span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Additional information about this text</p>
                </TooltipContent>
            </Tooltip>{' '}
            to see more information.
        </p>
    ),
};

/**
 * Toolbar with tooltips
 */
export const Toolbar: Story = {
    render: () => (
        <div className="flex items-center gap-1 rounded-md border p-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Plus className="size-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Add new</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Settings className="size-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Settings</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <HelpCircle className="size-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Help</p>
                </TooltipContent>
            </Tooltip>
        </div>
    ),
};

/**
 * Tooltip with longer content
 */
export const LongContent: Story = {
    render: () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                    <Info className="size-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px]">
                <p>This is a longer tooltip that contains more detailed information about the feature.</p>
            </TooltipContent>
        </Tooltip>
    ),
};

/**
 * Disabled button with tooltip
 */
export const DisabledButton: Story = {
    render: () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <span tabIndex={0}>
                    <Button variant="outline" disabled>
                        Disabled
                    </Button>
                </span>
            </TooltipTrigger>
            <TooltipContent>
                <p>This button is disabled because...</p>
            </TooltipContent>
        </Tooltip>
    ),
};
