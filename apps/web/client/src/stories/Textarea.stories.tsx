import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Textarea } from '@onlook/ui/textarea';

/**
 * Textarea component for multi-line text input.
 */
const meta = {
    title: 'UI/Textarea',
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

/**
 * Default textarea
 */
export const Default: Story = {
    args: {
        placeholder: 'Enter your message...',
    },
};

/**
 * Textarea with default value
 */
export const WithValue: Story = {
    args: {
        defaultValue: 'This is some pre-filled content in the textarea.',
    },
};

/**
 * Disabled textarea
 */
export const Disabled: Story = {
    args: {
        placeholder: 'Disabled textarea',
        disabled: true,
    },
};

/**
 * Invalid textarea state
 */
export const Invalid: Story = {
    args: {
        placeholder: 'Invalid input',
        'aria-invalid': true,
    },
};

/**
 * Textarea with custom rows
 */
export const CustomRows: Story = {
    args: {
        placeholder: 'Larger textarea...',
        rows: 6,
    },
};

/**
 * Long content textarea
 */
export const LongContent: Story = {
    args: {
        defaultValue: `This is a textarea with a lot of content.

It can contain multiple paragraphs and will automatically resize based on the content.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
    },
};

/**
 * All textarea states
 */
export const AllStates: Story = {
    render: () => (
        <div className="flex flex-col gap-4 w-[320px]">
            <Textarea placeholder="Default state" />
            <Textarea placeholder="Disabled state" disabled />
            <Textarea placeholder="Invalid state" aria-invalid />
            <Textarea defaultValue="With value" />
        </div>
    ),
};
