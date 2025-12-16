import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Slider } from '@onlook/ui/slider';

const meta = {
  component: Slider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
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
    orientation: {
      description: 'Orientation of the slider',
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
    },
  },
  args: {
    onValueChange: fn(),
  },
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
    defaultValue: [50],
    min: 0,
    max: 100,
    step: 10,
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
    min: 0,
    max: 100,
    disabled: true,
  },
};

export const CustomRange: Story = {
  args: {
    defaultValue: [0],
    min: -50,
    max: 50,
  },
};

export const SliderValues: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">0%</p>
        <Slider defaultValue={[0]} max={100} />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">25%</p>
        <Slider defaultValue={[25]} max={100} />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">50%</p>
        <Slider defaultValue={[50]} max={100} />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">75%</p>
        <Slider defaultValue={[75]} max={100} />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">100%</p>
        <Slider defaultValue={[100]} max={100} />
      </div>
    </div>
  ),
};
