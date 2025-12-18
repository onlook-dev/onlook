import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';

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
      <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" alt="User avatar" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80" alt="User avatar" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="" alt="User avatar" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const SingleLetter: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>A</AvatarFallback>
    </Avatar>
  ),
};

export const CustomSize: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="size-6">
        <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Small" alt="Small avatar" />
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>
      <Avatar className="size-8">
        <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Default" alt="Default avatar" />
        <AvatarFallback>DF</AvatarFallback>
      </Avatar>
      <Avatar className="size-12">
        <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Large" alt="Large avatar" />
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>
      <Avatar className="size-16">
        <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=XLarge" alt="Extra large avatar" />
        <AvatarFallback>XL</AvatarFallback>
      </Avatar>
    </div>
  ),
};

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
        <AvatarFallback>+3</AvatarFallback>
      </Avatar>
    </div>
  ),
};
