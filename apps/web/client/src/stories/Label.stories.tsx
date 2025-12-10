import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Label } from '@onlook/ui/label';
import { Input } from '@onlook/ui/input';
import { Checkbox } from '@onlook/ui/checkbox';
import { Switch } from '@onlook/ui/switch';
import { Badge } from '@onlook/ui/badge';

const meta = {
  component: Label,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: 'Label text content',
      control: 'text',
    },
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Label text',
  },
};

export const WithInput: Story = {
  render: () => (
    <div className="grid gap-2 w-[320px]">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="Enter your email" />
    </div>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const WithSwitch: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="notifications" />
      <Label htmlFor="notifications">Enable notifications</Label>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="grid gap-2 w-[320px]">
      <Label htmlFor="name">
        Name <span className="text-destructive">*</span>
      </Label>
      <Input id="name" placeholder="Enter your name" />
    </div>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <div className="grid gap-2 w-[320px]">
      <Label htmlFor="feature">
        Feature Name
        <Badge variant="secondary">Beta</Badge>
      </Label>
      <Input id="feature" placeholder="Enter feature name" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="grid gap-2 w-[320px]" data-disabled="true">
      <Label htmlFor="disabled-input" className="opacity-50">Disabled Field</Label>
      <Input id="disabled-input" disabled placeholder="This field is disabled" />
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="grid gap-4 w-[320px]">
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" placeholder="Enter username" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="Enter password" />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="remember" />
        <Label htmlFor="remember">Remember me</Label>
      </div>
    </div>
  ),
};
