import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Textarea } from '@onlook/ui/textarea';

const meta = {
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      description: 'Placeholder text',
      control: 'text',
    },
    disabled: {
      description: 'Whether the textarea is disabled',
      control: 'boolean',
    },
    rows: {
      description: 'Number of visible text lines',
      control: 'number',
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
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'This is some pre-filled text content that demonstrates how the textarea looks with content.',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
  },
};

export const WithRows: Story = {
  args: {
    placeholder: 'Textarea with 6 rows',
    rows: 6,
  },
};

export const LongContent: Story = {
  args: {
    defaultValue: `This is a textarea with a lot of content.

It demonstrates how the component handles multiple lines of text and how it expands to accommodate the content.

You can add as much text as you need, and the textarea will adjust accordingly. This is useful for forms that require longer text input like descriptions, comments, or messages.`,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[320px]">
      <Textarea placeholder="Default state" />
      <Textarea placeholder="With content" defaultValue="Some content here" />
      <Textarea placeholder="Disabled" disabled />
    </div>
  ),
};
