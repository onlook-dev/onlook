import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
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
        <p>This is the main content of the card.</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content of the card.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Cancel</Button>
        <Button className="ml-2">Save</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>This card has an action button in the header.</p>
      </CardContent>
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

export const FullExample: Story = {
  render: () => (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Project Settings</CardTitle>
        <CardDescription>Manage your project configuration</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            Reset
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Project Name</h4>
            <p className="text-sm text-muted-foreground">My Awesome Project</p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Description</h4>
            <p className="text-sm text-muted-foreground">
              A comprehensive project management solution.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <Button variant="outline">Cancel</Button>
        <Button className="ml-auto">Save Changes</Button>
      </CardFooter>
    </Card>
  ),
};
