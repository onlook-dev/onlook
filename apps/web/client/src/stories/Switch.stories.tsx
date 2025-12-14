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
    <div className="flex items-center justify-between space-x-4">
      <div className="space-y-0.5">
        <Label htmlFor="marketing">Marketing emails</Label>
        <p className="text-sm text-muted-foreground">
          Receive emails about new products and features.
        </p>
      </div>
      <Switch id="marketing" />
    </div>
  ),
};

export const SwitchGroup: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="notifications">Push Notifications</Label>
        <Switch id="notifications" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="emails">Email Notifications</Label>
        <Switch id="emails" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="sms">SMS Notifications</Label>
        <Switch id="sms" disabled />
      </div>
    </div>
  ),
};
