import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Alert, AlertTitle, AlertDescription } from '@onlook/ui/alert';
import { AlertCircle, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

const meta = {
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      description: 'Visual style variant',
      control: { type: 'select' },
      options: ['default', 'destructive'],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert>
      <Info />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        This is an informational alert message.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Something went wrong. Please try again later.
      </AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Alert>
      <CheckCircle2 className="text-green-500" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>
        Your changes have been saved successfully.
      </AlertDescription>
    </Alert>
  ),
};

export const Warning: Story = {
  render: () => (
    <Alert>
      <AlertTriangle className="text-yellow-500" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        This action cannot be undone. Please proceed with caution.
      </AlertDescription>
    </Alert>
  ),
};

export const WithoutIcon: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Notice</AlertTitle>
      <AlertDescription>
        This alert does not have an icon.
      </AlertDescription>
    </Alert>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <Alert>
      <Info />
      <AlertTitle>Quick notification without description</AlertTitle>
    </Alert>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[400px]">
      <Alert>
        <Info />
        <AlertTitle>Default Alert</AlertTitle>
        <AlertDescription>This is the default variant.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Destructive Alert</AlertTitle>
        <AlertDescription>This is the destructive variant.</AlertDescription>
      </Alert>
    </div>
  ),
};
