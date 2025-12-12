import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton } from '@onlook/ui/skeleton';

const meta = {
    component: Skeleton,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        className: 'h-4 w-[250px]',
    },
};

export const Circle: Story = {
    args: {
        className: 'h-12 w-12 rounded-full',
    },
};

export const Card: Story = {
    render: () => (
        <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
    ),
};

export const TextLines: Story = {
    render: () => (
        <div className="space-y-2 w-[300px]">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    ),
};

export const ProfileCard: Story = {
    render: () => (
        <div className="flex flex-col space-y-3 w-[300px]">
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
            </div>
        </div>
    ),
};

export const ListItems: Story = {
    render: () => (
        <div className="space-y-4 w-[300px]">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    ),
};

export const FormSkeleton: Story = {
    render: () => (
        <div className="space-y-4 w-[300px]">
            <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-10 w-24" />
        </div>
    ),
};
