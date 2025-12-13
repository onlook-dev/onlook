import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';

const meta = {
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    type: {
      description: 'The type of input',
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    placeholder: {
      description: 'Placeholder text',
      control: 'text',
    },
    disabled: {
      description: 'Whether the input is disabled',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="Enter your email" />
    </div>
  ),
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
};

export const Disabled: Story = {
  args: {
    type: 'text',
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const WithValue: Story = {
  args: {
    type: 'text',
    defaultValue: 'Pre-filled value',
  },
};

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
  },
};

export const File: Story = {
  args: {
    type: 'file',
  },
};

export const Invalid: Story = {
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="invalid-email">Email</Label>
      <Input
        id="invalid-email"
        type="email"
        placeholder="Enter your email"
        aria-invalid="true"
        defaultValue="invalid-email"
      />
    </div>
  ),
};
