import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Label } from '@onlook/ui/label';
import { Input } from '@onlook/ui/input';
import { Checkbox } from '@onlook/ui/checkbox';

const meta = {
    component: Label,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        htmlFor: {
            description: 'ID of the form element this label is for',
            control: 'text',
        },
    },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: 'Label',
    },
};

export const WithInput: Story = {
    render: () => (
        <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input type="email" id="email" placeholder="Email" />
        </div>
    ),
};

export const WithCheckbox: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
    ),
};

export const Required: Story = {
    render: () => (
        <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="username">
                Username <span className="text-destructive">*</span>
            </Label>
            <Input type="text" id="username" placeholder="Enter username" />
        </div>
    ),
};

export const WithDescription: Story = {
    render: () => (
        <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input type="password" id="password" placeholder="Enter password" />
            <p className="text-sm text-muted-foreground">
                Must be at least 8 characters long.
            </p>
        </div>
    ),
};

export const FormFields: Story = {
    render: () => (
        <div className="flex flex-col gap-4 w-[320px]">
            <div className="grid items-center gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input type="text" id="name" placeholder="Your name" />
            </div>
            <div className="grid items-center gap-1.5">
                <Label htmlFor="email-field">Email</Label>
                <Input type="email" id="email-field" placeholder="your@email.com" />
            </div>
            <div className="grid items-center gap-1.5">
                <Label htmlFor="message">Message</Label>
                <Input type="text" id="message" placeholder="Your message" />
            </div>
        </div>
    ),
};
