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

export const ThreeTabs: Story = {
  render: () => (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <p className="text-sm text-muted-foreground p-4">
          View and edit your profile information.
        </p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm text-muted-foreground p-4">
          Manage your account settings.
        </p>
      </TabsContent>
      <TabsContent value="billing">
        <p className="text-sm text-muted-foreground p-4">
          View your billing history and manage payment methods.
        </p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">
          <User />
          Account
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings />
          Settings
        </TabsTrigger>
        <TabsTrigger value="billing">
          <CreditCard />
          Billing
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-sm text-muted-foreground p-4">
          Manage your account details.
        </p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm text-muted-foreground p-4">
          Configure your preferences.
        </p>
      </TabsContent>
      <TabsContent value="billing">
        <p className="text-sm text-muted-foreground p-4">
          View billing information.
        </p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="active">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="disabled" disabled>Disabled</TabsTrigger>
        <TabsTrigger value="another">Another</TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <p className="text-sm text-muted-foreground p-4">
          This tab is active.
        </p>
      </TabsContent>
      <TabsContent value="another">
        <p className="text-sm text-muted-foreground p-4">
          This is another tab.
        </p>
      </TabsContent>
    </Tabs>
  ),
};
