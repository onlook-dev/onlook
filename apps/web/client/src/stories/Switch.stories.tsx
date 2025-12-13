import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Switch } from '@onlook/ui/switch';
import { Label } from '@onlook/ui/label';

const meta = {
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      description: 'Whether the switch is checked',
      control: 'boolean',
    },
    disabled: {
      description: 'Whether the switch is disabled',
      control: 'boolean',
    },
  },
  args: {
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof Switch>;

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
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="flex items-start space-x-3">
      <Switch id="notifications" className="mt-1" />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor="notifications">Enable notifications</Label>
        <p className="text-sm text-muted-foreground">
          Receive push notifications for important updates.
        </p>
      </div>
    </div>
  ),
};

export const SwitchGroup: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between w-64">
        <Label htmlFor="wifi">Wi-Fi</Label>
        <Switch id="wifi" defaultChecked />
      </div>
      <div className="flex items-center justify-between w-64">
        <Label htmlFor="bluetooth">Bluetooth</Label>
        <Switch id="bluetooth" />
      </div>
      <div className="flex items-center justify-between w-64">
        <Label htmlFor="location">Location Services</Label>
        <Switch id="location" defaultChecked />
      </div>
    </div>
  ),
};
