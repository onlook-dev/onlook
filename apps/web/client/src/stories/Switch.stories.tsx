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
    <div className="flex items-center gap-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Switch id="off" />
        <Label htmlFor="off">Off</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="on" defaultChecked />
        <Label htmlFor="on">On</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="disabled-off" disabled />
        <Label htmlFor="disabled-off" className="text-muted-foreground">Disabled Off</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="disabled-on" disabled defaultChecked />
        <Label htmlFor="disabled-on" className="text-muted-foreground">Disabled On</Label>
      </div>
    </div>
  ),
};

export const SettingsExample: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[300px]">
      <div className="flex items-center justify-between">
        <Label htmlFor="notifications">Push Notifications</Label>
        <Switch id="notifications" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="marketing">Marketing Emails</Label>
        <Switch id="marketing" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="updates">Product Updates</Label>
        <Switch id="updates" defaultChecked />
      </div>
    </div>
  ),
};
