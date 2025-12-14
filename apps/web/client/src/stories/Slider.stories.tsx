import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Slider } from '@onlook/ui/slider';
import { Label } from '@onlook/ui/label';

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
      <div className="w-[300px]">
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
    max: 100,
    step: 1,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="volume">Volume</Label>
        <span className="text-sm text-muted-foreground">50%</span>
      </div>
      <Slider id="volume" defaultValue={[50]} max={100} step={1} />
    </div>
  ),
};

export const Range: Story = {
  args: {
    defaultValue: [25, 75],
    max: 100,
    step: 1,
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
    disabled: true,
  },
};

export const CustomStep: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <Label>Step: 10</Label>
      </div>
      <Slider defaultValue={[50]} max={100} step={10} />
    </div>
  ),
};

export const CustomRange: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <Label>Temperature (0-40)</Label>
      </div>
      <Slider defaultValue={[20]} min={0} max={40} step={1} />
    </div>
  ),
};

export const MultipleSliders: Story = {
  render: () => (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Bass</Label>
          <span className="text-sm text-muted-foreground">60%</span>
        </div>
        <Slider defaultValue={[60]} max={100} step={1} />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Treble</Label>
          <span className="text-sm text-muted-foreground">40%</span>
        </div>
        <Slider defaultValue={[40]} max={100} step={1} />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Mid</Label>
          <span className="text-sm text-muted-foreground">50%</span>
        </div>
        <Slider defaultValue={[50]} max={100} step={1} />
      </div>
    </div>
  ),
};
