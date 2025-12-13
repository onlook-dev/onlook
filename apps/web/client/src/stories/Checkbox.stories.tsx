import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Checkbox } from '@onlook/ui/checkbox';
import { Label } from '@onlook/ui/label';

const meta = {
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      description: 'Whether the checkbox is checked',
      control: 'boolean',
    },
    disabled: {
      description: 'Whether the checkbox is disabled',
      control: 'boolean',
    },
  },
  args: {
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="flex items-start space-x-2">
      <Checkbox id="newsletter" className="mt-1" />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor="newsletter">Subscribe to newsletter</Label>
        <p className="text-sm text-muted-foreground">
          Get notified about new features and updates.
        </p>
      </div>
    </div>
  ),
};

export const CheckboxGroup: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center space-x-2">
        <Checkbox id="option1" defaultChecked />
        <Label htmlFor="option1">Option 1</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option2" />
        <Label htmlFor="option2">Option 2</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="option3" />
        <Label htmlFor="option3">Option 3</Label>
      </div>
    </div>
  ),
};
