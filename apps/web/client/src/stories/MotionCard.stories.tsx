import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  MotionCard,
  MotionCardHeader,
  MotionCardTitle,
  MotionCardDescription,
  MotionCardContent,
  MotionCardFooter,
} from '@onlook/ui/motion-card';
import { Button } from '@onlook/ui/button';

/**
 * MotionCard is an animated card component built with Framer Motion.
 * It provides a glassmorphism-style card with blur effects and subtle shadows.
 * The card is composed of multiple sub-components for flexible layouts.
 */
const meta = {
  title: 'UI/MotionCard',
  component: MotionCard,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MotionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default card with all sub-components
 */
export const Default: Story = {
  render: () => (
    <MotionCard>
      <MotionCardHeader>
        <MotionCardTitle>Card Title</MotionCardTitle>
        <MotionCardDescription>
          This is a description of the card content.
        </MotionCardDescription>
      </MotionCardHeader>
      <MotionCardContent>
        <p className="text-sm">
          This is the main content area of the card. You can put any content here.
        </p>
      </MotionCardContent>
      <MotionCardFooter>
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm">Save</Button>
      </MotionCardFooter>
    </MotionCard>
  ),
};

/**
 * Simple card with just content
 */
export const SimpleContent: Story = {
  render: () => (
    <MotionCard>
      <MotionCardContent>
        <p className="text-sm">
          A simple card with just content, no header or footer.
        </p>
      </MotionCardContent>
    </MotionCard>
  ),
};

/**
 * Card with header only
 */
export const HeaderOnly: Story = {
  render: () => (
    <MotionCard>
      <MotionCardHeader>
        <MotionCardTitle>Notification</MotionCardTitle>
        <MotionCardDescription>
          You have 3 new messages in your inbox.
        </MotionCardDescription>
      </MotionCardHeader>
    </MotionCard>
  ),
};

/**
 * Card with animation props
 */
export const WithAnimation: Story = {
  render: () => (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <MotionCardHeader>
        <MotionCardTitle>Animated Card</MotionCardTitle>
        <MotionCardDescription>
          This card animates in when it appears.
        </MotionCardDescription>
      </MotionCardHeader>
      <MotionCardContent>
        <p className="text-sm">
          The card uses Framer Motion for smooth animations.
        </p>
      </MotionCardContent>
    </MotionCard>
  ),
};

/**
 * Card with hover animation
 */
export const WithHoverAnimation: Story = {
  render: () => (
    <MotionCard
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="cursor-pointer"
    >
      <MotionCardHeader>
        <MotionCardTitle>Hover Me</MotionCardTitle>
        <MotionCardDescription>
          This card scales up slightly on hover.
        </MotionCardDescription>
      </MotionCardHeader>
      <MotionCardContent>
        <p className="text-sm">
          Try hovering over this card to see the animation effect.
        </p>
      </MotionCardContent>
    </MotionCard>
  ),
};

/**
 * Card as a form container
 */
export const FormCard: Story = {
  render: () => (
    <MotionCard>
      <MotionCardHeader>
        <MotionCardTitle>Create Project</MotionCardTitle>
        <MotionCardDescription>
          Enter the details for your new project.
        </MotionCardDescription>
      </MotionCardHeader>
      <MotionCardContent>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Project Name</label>
            <input
              type="text"
              placeholder="My Awesome Project"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea
              placeholder="Describe your project..."
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
            />
          </div>
        </div>
      </MotionCardContent>
      <MotionCardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm">Create</Button>
      </MotionCardFooter>
    </MotionCard>
  ),
};

/**
 * Card as a notification
 */
export const NotificationCard: Story = {
  render: () => (
    <MotionCard
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
    >
      <MotionCardHeader>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <MotionCardTitle>Success!</MotionCardTitle>
        </div>
        <MotionCardDescription>
          Your project has been deployed successfully.
        </MotionCardDescription>
      </MotionCardHeader>
    </MotionCard>
  ),
};

/**
 * Card with image
 */
export const WithImage: Story = {
  render: () => (
    <MotionCard className="overflow-hidden">
      <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600" />
      <MotionCardHeader>
        <MotionCardTitle>Featured Project</MotionCardTitle>
        <MotionCardDescription>
          A beautiful project showcase card with an image header.
        </MotionCardDescription>
      </MotionCardHeader>
      <MotionCardFooter>
        <Button variant="outline" size="sm" className="w-full">View Project</Button>
      </MotionCardFooter>
    </MotionCard>
  ),
};

/**
 * Card with stats
 */
export const StatsCard: Story = {
  render: () => (
    <MotionCard>
      <MotionCardHeader>
        <MotionCardTitle>Project Stats</MotionCardTitle>
        <MotionCardDescription>
          Overview of your project performance.
        </MotionCardDescription>
      </MotionCardHeader>
      <MotionCardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold">1,234</p>
            <p className="text-xs text-muted-foreground">Total Views</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold">56</p>
            <p className="text-xs text-muted-foreground">Active Users</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold">89%</p>
            <p className="text-xs text-muted-foreground">Uptime</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold">4.8</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>
      </MotionCardContent>
    </MotionCard>
  ),
};

/**
 * Multiple cards in a grid
 */
export const CardGrid: Story = {
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <MotionCardHeader>
          <MotionCardTitle>Card One</MotionCardTitle>
          <MotionCardDescription>First card in the grid.</MotionCardDescription>
        </MotionCardHeader>
      </MotionCard>
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <MotionCardHeader>
          <MotionCardTitle>Card Two</MotionCardTitle>
          <MotionCardDescription>Second card in the grid.</MotionCardDescription>
        </MotionCardHeader>
      </MotionCard>
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <MotionCardHeader>
          <MotionCardTitle>Card Three</MotionCardTitle>
          <MotionCardDescription>Third card in the grid.</MotionCardDescription>
        </MotionCardHeader>
      </MotionCard>
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <MotionCardHeader>
          <MotionCardTitle>Card Four</MotionCardTitle>
          <MotionCardDescription>Fourth card in the grid.</MotionCardDescription>
        </MotionCardHeader>
      </MotionCard>
    </div>
  ),
};
