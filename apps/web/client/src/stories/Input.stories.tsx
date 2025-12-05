import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from '@onlook/ui/input';

/**
 * Input component for text entry with various states and types.
 */
const meta = {
    title: 'UI/Input',
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
            description: 'HTML input type',
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

/**
 * Default text input
 */
export const Default: Story = {
    args: {
        type: 'text',
        placeholder: 'Enter text...',
    },
};

/**
 * Email input type
 */
export const Email: Story = {
    args: {
        type: 'email',
        placeholder: 'Enter your email...',
    },
};

/**
 * Password input type
 */
export const Password: Story = {
    args: {
        type: 'password',
        placeholder: 'Enter password...',
    },
};

/**
 * Search input type
 */
export const Search: Story = {
    args: {
        type: 'search',
        placeholder: 'Search...',
    },
};

/**
 * Disabled input state
 */
export const Disabled: Story = {
    args: {
        type: 'text',
        placeholder: 'Disabled input',
        disabled: true,
    },
};

/**
 * Input with value
 */
export const WithValue: Story = {
    args: {
        type: 'text',
        defaultValue: 'Hello World',
    },
};

/**
 * Invalid input state
 */
export const Invalid: Story = {
    args: {
        type: 'email',
        defaultValue: 'invalid-email',
        'aria-invalid': true,
    },
};

/**
 * All input types displayed together
 */
export const AllTypes: Story = {
    render: () => (
        <div className="flex flex-col gap-4 w-[320px]">
            <Input type="text" placeholder="Text input" />
            <Input type="email" placeholder="Email input" />
            <Input type="password" placeholder="Password input" />
            <Input type="number" placeholder="Number input" />
            <Input type="search" placeholder="Search input" />
            <Input type="tel" placeholder="Phone input" />
            <Input type="url" placeholder="URL input" />
        </div>
    ),
};

/**
 * Input states
 */
export const States: Story = {
    render: () => (
        <div className="flex flex-col gap-4 w-[320px]">
            <Input placeholder="Default state" />
            <Input placeholder="Disabled state" disabled />
            <Input placeholder="Invalid state" aria-invalid />
            <Input defaultValue="With value" />
        </div>
    ),
};
