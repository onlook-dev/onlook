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
        placeholder: 'Type your message here...',
    },
};

export const WithValue: Story = {
    args: {
        defaultValue: 'This is some pre-filled content in the textarea.',
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
        placeholder: 'Textarea with 5 rows',
        rows: 5,
    },
};

export const LongContent: Story = {
    args: {
        defaultValue:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    },
};

export const States: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <Textarea placeholder="Default textarea" />
            <Textarea placeholder="Disabled textarea" disabled />
            <Textarea defaultValue="Textarea with content" />
        </div>
    ),
};
