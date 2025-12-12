import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@onlook/ui/tabs';
import { Settings, User, CreditCard } from 'lucide-react';

const meta = {
    component: Tabs,
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
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Tabs defaultValue="account">
            <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="account">
                <p className="text-sm text-muted-foreground p-4">
                    Make changes to your account here.
                </p>
            </TabsContent>
            <TabsContent value="password">
                <p className="text-sm text-muted-foreground p-4">
                    Change your password here.
                </p>
            </TabsContent>
        </Tabs>
    ),
};

export const WithIcons: Story = {
    render: () => (
        <Tabs defaultValue="profile">
            <TabsList>
                <TabsTrigger value="profile">
                    <User className="h-4 w-4" />
                    Profile
                </TabsTrigger>
                <TabsTrigger value="settings">
                    <Settings className="h-4 w-4" />
                    Settings
                </TabsTrigger>
                <TabsTrigger value="billing">
                    <CreditCard className="h-4 w-4" />
                    Billing
                </TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
                <p className="text-sm text-muted-foreground p-4">
                    Manage your profile information.
                </p>
            </TabsContent>
            <TabsContent value="settings">
                <p className="text-sm text-muted-foreground p-4">
                    Configure your application settings.
                </p>
            </TabsContent>
            <TabsContent value="billing">
                <p className="text-sm text-muted-foreground p-4">
                    Manage your billing and subscription.
                </p>
            </TabsContent>
        </Tabs>
    ),
};

export const ThreeTabs: Story = {
    render: () => (
        <Tabs defaultValue="tab1">
            <TabsList>
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">
                <p className="text-sm text-muted-foreground p-4">Content for Tab 1</p>
            </TabsContent>
            <TabsContent value="tab2">
                <p className="text-sm text-muted-foreground p-4">Content for Tab 2</p>
            </TabsContent>
            <TabsContent value="tab3">
                <p className="text-sm text-muted-foreground p-4">Content for Tab 3</p>
            </TabsContent>
        </Tabs>
    ),
};

export const DisabledTab: Story = {
    render: () => (
        <Tabs defaultValue="active">
            <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="disabled" disabled>
                    Disabled
                </TabsTrigger>
                <TabsTrigger value="another">Another</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
                <p className="text-sm text-muted-foreground p-4">This tab is active.</p>
            </TabsContent>
            <TabsContent value="another">
                <p className="text-sm text-muted-foreground p-4">Another tab content.</p>
            </TabsContent>
        </Tabs>
    ),
};
