import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar, AvatarImage, AvatarFallback } from '@onlook/ui/avatar';

const meta = {
    component: Avatar,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
        </Avatar>
    ),
};

export const WithFallback: Story = {
    render: () => (
        <Avatar>
            <AvatarImage src="/broken-image.jpg" alt="User" />
            <AvatarFallback>JD</AvatarFallback>
        </Avatar>
    ),
};

export const FallbackOnly: Story = {
    render: () => (
        <Avatar>
            <AvatarFallback>AB</AvatarFallback>
        </Avatar>
    ),
};

export const Sizes: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Avatar className="size-6">
                <AvatarImage src="https://github.com/shadcn.png" alt="Small" />
                <AvatarFallback>SM</AvatarFallback>
            </Avatar>
            <Avatar className="size-8">
                <AvatarImage src="https://github.com/shadcn.png" alt="Default" />
                <AvatarFallback>MD</AvatarFallback>
            </Avatar>
            <Avatar className="size-12">
                <AvatarImage src="https://github.com/shadcn.png" alt="Large" />
                <AvatarFallback>LG</AvatarFallback>
            </Avatar>
            <Avatar className="size-16">
                <AvatarImage src="https://github.com/shadcn.png" alt="Extra Large" />
                <AvatarFallback>XL</AvatarFallback>
            </Avatar>
        </div>
    ),
};

export const Group: Story = {
    render: () => (
        <div className="flex -space-x-2">
            <Avatar className="border-2 border-background">
                <AvatarImage src="https://github.com/shadcn.png" alt="User 1" />
                <AvatarFallback>U1</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-background">
                <AvatarFallback>U2</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-background">
                <AvatarFallback>U3</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-background">
                <AvatarFallback>+5</AvatarFallback>
            </Avatar>
        </div>
    ),
};
