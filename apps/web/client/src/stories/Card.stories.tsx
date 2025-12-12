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

const meta = {
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

export const Default: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Card content goes here. This is where you put the main content of the card.</p>
            </CardContent>
            <CardFooter>
                <Button>Action</Button>
            </CardFooter>
        </Card>
    ),
};

export const Simple: Story = {
    render: () => (
        <Card>
            <CardContent>
                <p>A simple card with just content.</p>
            </CardContent>
        </Card>
    ),
};

export const WithAction: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Project Settings</CardTitle>
                <CardDescription>Manage your project configuration</CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm">
                        Edit
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <p>Configure your project settings here.</p>
            </CardContent>
        </Card>
    ),
};

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

export const HeaderOnly: Story = {
    render: () => (
        <Card>
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>You have 3 unread messages</CardDescription>
            </CardHeader>
        </Card>
    ),
};
