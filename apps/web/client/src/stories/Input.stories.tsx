import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Input } from '@onlook/ui/input';

const meta = {
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      description: 'Input type',
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
  args: {
    onChange: fn(),
    onFocus: fn(),
    onBlur: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter email...',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
  },
};

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
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

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[320px]">
      <Input type="text" placeholder="Text input" />
      <Input type="email" placeholder="Email input" />
      <Input type="password" placeholder="Password input" />
      <Input type="number" placeholder="Number input" />
      <Input type="search" placeholder="Search input" />
    </div>
  ),
};
