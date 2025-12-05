import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    CardAction,
} from '@onlook/ui/card';
import { Button } from '@onlook/ui/button';
import { MoreHorizontal } from 'lucide-react';

/**
 * Card is a compound component for displaying content in a contained, styled box.
 * It includes Header, Title, Description, Content, Footer, and Action sub-components.
 */
const meta = {
    title: 'UI/Card',
    component: Card,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="w-[400px]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default card with all sub-components
 */
export const Default: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
            </CardHeader>
            <CardContent>
                <p>This is the main content of the card. You can put any content here.</p>
            </CardContent>
            <CardFooter>
                <Button>Action</Button>
            </CardFooter>
        </Card>
    ),
};

/**
 * Simple card with just content
 */
export const Simple: Story = {
    render: () => (
        <Card>
            <CardContent>
                <p>A simple card with just content.</p>
            </CardContent>
        </Card>
    ),
};

/**
 * Card with header only
 */
export const HeaderOnly: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Project Settings</CardTitle>
                <CardDescription>Manage your project configuration</CardDescription>
            </CardHeader>
        </Card>
    ),
};

/**
 * Card with action button in header
 */
export const WithAction: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage your team</CardDescription>
                <CardAction>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <p>List of team members would go here.</p>
            </CardContent>
        </Card>
    ),
};

/**
 * Card with footer actions
 */
export const WithFooterActions: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Delete Project</CardTitle>
                <CardDescription>This action cannot be undone</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Are you sure you want to delete this project? All data will be permanently removed.</p>
            </CardContent>
            <CardFooter className="gap-2">
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive">Delete</Button>
            </CardFooter>
        </Card>
    ),
};

/**
 * Card with form content
 */
export const FormCard: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Update your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <input
                        type="text"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="Enter your name"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input
                        type="email"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="Enter your email"
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button>Save Changes</Button>
            </CardFooter>
        </Card>
    ),
};

/**
 * Minimal card without padding
 */
export const Minimal: Story = {
    render: () => (
        <Card className="p-0">
            <div className="p-6">
                <p>Custom padded content</p>
            </div>
        </Card>
    ),
};
