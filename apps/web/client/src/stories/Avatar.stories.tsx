import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar, AvatarImage, AvatarFallback } from '@onlook/ui/avatar';

/**
 * Avatar displays a user's profile image with a fallback for when the image is unavailable.
 */
const meta = {
    title: 'UI/Avatar',
    component: Avatar,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default avatar with image
 */
export const Default: Story = {
    render: () => (
        <Avatar>
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" alt="Jane Doe" />
            <AvatarFallback>JD</AvatarFallback>
        </Avatar>
    ),
};

/**
 * Avatar with fallback (no image)
 */
export const Fallback: Story = {
    render: () => (
        <Avatar>
            <AvatarImage src="" alt="User" />
            <AvatarFallback>AB</AvatarFallback>
        </Avatar>
    ),
};

/**
 * Avatar with real photo
 */
export const WithPhoto: Story = {
    render: () => (
        <Avatar>
            <AvatarImage
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80"
                alt="User"
            />
            <AvatarFallback>US</AvatarFallback>
        </Avatar>
    ),
};

/**
 * Different sizes
 */
export const Sizes: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Avatar className="size-6">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Small" alt="Small" />
                <AvatarFallback className="text-xs">SM</AvatarFallback>
            </Avatar>
            <Avatar className="size-8">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Default" alt="Default" />
                <AvatarFallback>DF</AvatarFallback>
            </Avatar>
            <Avatar className="size-12">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Medium" alt="Medium" />
                <AvatarFallback>MD</AvatarFallback>
            </Avatar>
            <Avatar className="size-16">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Large" alt="Large" />
                <AvatarFallback className="text-lg">LG</AvatarFallback>
            </Avatar>
            <Avatar className="size-24">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=XLarge" alt="Extra Large" />
                <AvatarFallback className="text-2xl">XL</AvatarFallback>
            </Avatar>
        </div>
    ),
};

/**
 * Avatar group
 */
export const AvatarGroup: Story = {
    render: () => (
        <div className="flex -space-x-2">
            <Avatar className="border-2 border-background">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=User1" alt="User 1" />
                <AvatarFallback>U1</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-background">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=User2" alt="User 2" />
                <AvatarFallback>U2</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-background">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=User3" alt="User 3" />
                <AvatarFallback>U3</AvatarFallback>
            </Avatar>
            <Avatar className="border-2 border-background">
                <AvatarFallback>+5</AvatarFallback>
            </Avatar>
        </div>
    ),
};

/**
 * Avatar with status indicator
 */
export const WithStatus: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <div className="relative">
                <Avatar>
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Online" alt="Online" />
                    <AvatarFallback>ON</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div className="relative">
                <Avatar>
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Away" alt="Away" />
                    <AvatarFallback>AW</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-3 rounded-full bg-yellow-500 border-2 border-background" />
            </div>
            <div className="relative">
                <Avatar>
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Offline" alt="Offline" />
                    <AvatarFallback>OF</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-3 rounded-full bg-gray-500 border-2 border-background" />
            </div>
        </div>
    ),
};

/**
 * Avatar in a user card
 */
export const UserCard: Story = {
    render: () => (
        <div className="flex items-center gap-3 rounded-lg border p-4">
            <Avatar className="size-12">
                <AvatarImage
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80"
                    alt="John Doe"
                />
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-medium">John Doe</p>
                <p className="text-sm text-muted-foreground">john@example.com</p>
            </div>
        </div>
    ),
};

/**
 * Fallback variations
 */
export const FallbackVariations: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Avatar>
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">AB</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarFallback className="bg-destructive text-white">CD</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarFallback className="bg-green-500 text-white">EF</AvatarFallback>
            </Avatar>
        </div>
    ),
};
