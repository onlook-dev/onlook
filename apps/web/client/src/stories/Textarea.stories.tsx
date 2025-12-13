import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Textarea } from '@onlook/ui/textarea';
import { Label } from '@onlook/ui/label';

const meta = {
  component: Textarea,
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
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" placeholder="Type your message here" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'This is some pre-filled content in the textarea that spans multiple lines to demonstrate how the component handles longer text.',
  },
};

export const WithRows: Story = {
  args: {
    placeholder: 'Textarea with 6 rows',
    rows: 6,
  },
};

export const Invalid: Story = {
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="invalid-message">Message</Label>
      <Textarea
        id="invalid-message"
        placeholder="Type your message here"
        aria-invalid="true"
        defaultValue="Invalid content"
      />
    </div>
  ),
};
