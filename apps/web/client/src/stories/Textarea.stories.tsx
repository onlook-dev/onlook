import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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

export const WithRows: Story = {
  args: {
    placeholder: 'Enter your message...',
    rows: 6,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
  },
};

export const DisabledWithValue: Story = {
  args: {
    defaultValue: 'This content cannot be edited',
    disabled: true,
  },
};

export const LongContent: Story = {
  args: {
    defaultValue: `This is a longer piece of content that demonstrates how the textarea handles multiple lines of text.

It can contain paragraphs, line breaks, and various formatting.

The textarea will automatically adjust its height based on the content when using the field-sizing-content class.`,
  },
};
