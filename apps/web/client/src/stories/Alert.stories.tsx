import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Alert, AlertTitle, AlertDescription } from '@onlook/ui/alert';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * Alert displays important messages to users with different severity levels.
 */
const meta = {
    title: 'UI/Alert',
    component: Alert,
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
    argTypes: {
        variant: {
            description: 'Visual style variant of the alert',
            control: { type: 'select' },
            options: ['default', 'destructive'],
        },
    },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default alert with title and description
 */
export const Default: Story = {
    render: () => (
        <Alert>
            <Info className="size-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
                This is an informational alert message.
            </AlertDescription>
        </Alert>
    ),
};

/**
 * Destructive alert for errors
 */
export const Destructive: Story = {
    render: () => (
        <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
                Something went wrong. Please try again later.
            </AlertDescription>
        </Alert>
    ),
};

/**
 * Success alert
 */
export const Success: Story = {
    render: () => (
        <Alert>
            <CheckCircle className="size-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
                Your changes have been saved successfully.
            </AlertDescription>
        </Alert>
    ),
};

/**
 * Warning alert
 */
export const Warning: Story = {
    render: () => (
        <Alert>
            <AlertTriangle className="size-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
                This action may have unintended consequences.
            </AlertDescription>
        </Alert>
    ),
};

/**
 * Alert with title only
 */
export const TitleOnly: Story = {
    render: () => (
        <Alert>
            <Info className="size-4" />
            <AlertTitle>Quick notification</AlertTitle>
        </Alert>
    ),
};

/**
 * Alert with description only
 */
export const DescriptionOnly: Story = {
    render: () => (
        <Alert>
            <Info className="size-4" />
            <AlertDescription>
                A simple alert message without a title.
            </AlertDescription>
        </Alert>
    ),
};

/**
 * All alert variants
 */
export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-4 w-[400px]">
            <Alert>
                <Info className="size-4" />
                <AlertTitle>Default Alert</AlertTitle>
                <AlertDescription>
                    This is the default alert style.
                </AlertDescription>
            </Alert>
            <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Destructive Alert</AlertTitle>
                <AlertDescription>
                    This is the destructive alert style.
                </AlertDescription>
            </Alert>
        </div>
    ),
};
