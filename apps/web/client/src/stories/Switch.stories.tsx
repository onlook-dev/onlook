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

export const SwitchGroup: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between w-[250px]">
        <Label htmlFor="notifications">Notifications</Label>
        <Switch id="notifications" />
      </div>
      <div className="flex items-center justify-between w-[250px]">
        <Label htmlFor="dark-mode">Dark Mode</Label>
        <Switch id="dark-mode" defaultChecked />
      </div>
      <div className="flex items-center justify-between w-[250px]">
        <Label htmlFor="auto-save">Auto Save (disabled)</Label>
        <Switch id="auto-save" disabled />
      </div>
    </div>
  ),
};
