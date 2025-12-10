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
        <p>Card content with some text explaining the purpose of this card.</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card with Footer</CardTitle>
        <CardDescription>This card has a footer with actions</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Some content that describes what this card is about.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card with Action</CardTitle>
        <CardDescription>This card has an action button in the header</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">Edit</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Content area of the card.</p>
      </CardContent>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card>
      <CardContent>
        <p>A simple card with just content, no header or footer.</p>
      </CardContent>
    </Card>
  ),
};

export const FullExample: Story = {
  render: () => (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Complete Card Example</CardTitle>
        <CardDescription>This card demonstrates all available components</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">Settings</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>This is the main content area of the card.</p>
          <p className="text-muted-foreground text-sm">
            You can add any content here including forms, lists, or other components.
          </p>
        </div>
      </CardContent>
      <CardFooter className="border-t gap-2 justify-end">
        <Button variant="ghost">Cancel</Button>
        <Button>Confirm</Button>
      </CardFooter>
    </Card>
  ),
};
