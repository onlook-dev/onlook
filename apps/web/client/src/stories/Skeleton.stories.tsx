import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton } from '@onlook/ui/skeleton';

/**
 * Skeleton is a placeholder component used to indicate loading states.
 */
const meta = {
    title: 'UI/Skeleton',
    component: Skeleton,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default skeleton
 */
export const Default: Story = {
    args: {
        className: 'h-4 w-[200px]',
    },
};

/**
 * Circle skeleton (for avatars)
 */
export const Circle: Story = {
    args: {
        className: 'h-12 w-12 rounded-full',
    },
};

/**
 * Card skeleton
 */
export const CardSkeleton: Story = {
    render: () => (
        <div className="flex flex-col space-y-3 w-[300px]">
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
    ),
};

/**
 * Profile skeleton
 */
export const ProfileSkeleton: Story = {
    render: () => (
        <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
            </div>
        </div>
    ),
};

/**
 * List skeleton
 */
export const ListSkeleton: Story = {
    render: () => (
        <div className="space-y-4 w-[300px]">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[60%]" />
                    </div>
                </div>
            ))}
        </div>
    ),
};

/**
 * Table skeleton
 */
export const TableSkeleton: Story = {
    render: () => (
        <div className="space-y-2 w-[400px]">
            <div className="flex gap-4">
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-8 w-[150px]" />
                <Skeleton className="h-8 w-[100px]" />
            </div>
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4">
                    <Skeleton className="h-6 w-[100px]" />
                    <Skeleton className="h-6 w-[150px]" />
                    <Skeleton className="h-6 w-[100px]" />
                </div>
            ))}
        </div>
    ),
};

/**
 * Form skeleton
 */
export const FormSkeleton: Story = {
    render: () => (
        <div className="space-y-4 w-[300px]">
            <div className="space-y-2">
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-10 w-[100px]" />
        </div>
    ),
};

/**
 * Various skeleton shapes
 */
export const Shapes: Story = {
    render: () => (
        <div className="flex flex-wrap gap-4 items-center">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-6 w-[150px] rounded-full" />
            <Skeleton className="h-20 w-20 rounded-xl" />
        </div>
    ),
};
