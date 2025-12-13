import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@onlook/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';

const meta = {
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
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

export const WithArrow: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">With arrow</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Tooltip with arrow</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const WithoutArrow: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Without arrow</Button>
      </TooltipTrigger>
      <TooltipContent hideArrow>
        <p>Tooltip without arrow</p>
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

export const WithDelay: Story = {
  render: () => (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <Button variant="outline">Delayed tooltip (500ms)</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This tooltip has a 500ms delay</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Long content</Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[200px]">
        <p>This is a longer tooltip message that wraps to multiple lines when it exceeds the maximum width.</p>
      </TooltipContent>
    </Tooltip>
  ),
};
