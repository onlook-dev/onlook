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
      control: { type: 'range', min: 0, max: 100 },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 33,
  },
};

export const Empty: Story = {
  args: {
    value: 0,
  },
};

export const Half: Story = {
  args: {
    value: 50,
  },
};

export const Full: Story = {
  args: {
    value: 100,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Progress</span>
        <span>66%</span>
      </div>
      <Progress value={66} />
    </div>
  ),
};

export const MultipleProgress: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Storage</span>
          <span>25%</span>
        </div>
        <Progress value={25} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Memory</span>
          <span>60%</span>
        </div>
        <Progress value={60} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>CPU</span>
          <span>85%</span>
        </div>
        <Progress value={85} />
      </div>
    </div>
  ),
};
