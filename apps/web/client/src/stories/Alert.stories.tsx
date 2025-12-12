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
            description: 'Visual style variant of the alert',
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
            <Info className="h-4 w-4" />
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
            <AlertCircle className="h-4 w-4" />
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
            <CheckCircle2 className="h-4 w-4 text-green-500" />
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
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
                This action may have unintended consequences.
            </AlertDescription>
        </Alert>
    ),
};

export const TitleOnly: Story = {
    render: () => (
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Quick notification</AlertTitle>
        </Alert>
    ),
};

export const Variants: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Default Alert</AlertTitle>
                <AlertDescription>
                    This is the default alert style.
                </AlertDescription>
            </Alert>
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Destructive Alert</AlertTitle>
                <AlertDescription>
                    This is the destructive alert style.
                </AlertDescription>
            </Alert>
        </div>
    ),
};
