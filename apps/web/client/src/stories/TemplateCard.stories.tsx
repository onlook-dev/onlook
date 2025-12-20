import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { TemplateCard } from '@/app/projects/_components/templates/template-card';

/**
 * TemplateCard displays a template preview with title, description, image,
 * and optional star/favorite functionality.
 */
const meta = {
  title: 'Projects/TemplateCard',
  component: TemplateCard,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: 'Title of the template',
      control: 'text',
    },
    description: {
      description: 'Brief description of the template',
      control: 'text',
    },
    image: {
      description: 'Preview image URL for the template',
      control: 'text',
    },
    isNew: {
      description: 'Whether to show the "New" badge',
      control: 'boolean',
    },
    isStarred: {
      description: 'Whether the template is starred/favorited',
      control: 'boolean',
    },
  },
  args: {
    onClick: fn(),
    onToggleStar: fn(),
  },
} satisfies Meta<typeof TemplateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default template card with all standard props
 */
export const Default: Story = {
  args: {
    title: 'Next.js Starter',
    description: 'A full-featured Next.js template with authentication and database setup.',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    isNew: false,
    isStarred: false,
  },
};

/**
 * Template card with the "New" badge
 */
export const New: Story = {
  args: {
    ...Default.args,
    title: 'React Dashboard',
    description: 'Modern dashboard template with charts, tables, and analytics.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    isNew: true,
  },
};

/**
 * Template card that is starred/favorited
 */
export const Starred: Story = {
  args: {
    ...Default.args,
    title: 'E-commerce Template',
    description: 'Complete e-commerce solution with cart, checkout, and payment integration.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isStarred: true,
  },
};

/**
 * Template card without an image (shows gradient placeholder)
 */
export const NoImage: Story = {
  args: {
    ...Default.args,
    title: 'Blank Template',
    description: 'Start from scratch with a minimal setup.',
    image: undefined,
  },
};

/**
 * Template card with long text that should truncate
 */
export const LongText: Story = {
  args: {
    ...Default.args,
    title: 'Super Long Template Name That Should Truncate Properly',
    description: 'This is a very long description that explains all the features of this template in great detail and should be truncated after two lines.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
  },
};

/**
 * Template card with both New badge and starred
 */
export const NewAndStarred: Story = {
  args: {
    ...Default.args,
    title: 'Featured Template',
    description: 'Our most popular template with all the bells and whistles.',
    image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    isNew: true,
    isStarred: true,
  },
};

/**
 * Template card without star functionality (no onToggleStar callback)
 */
export const WithoutStarButton: Story = {
  args: {
    title: 'Simple Template',
    description: 'A basic template without favorite functionality.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    isNew: false,
    isStarred: false,
    onToggleStar: undefined,
  },
};

/**
 * Multiple template cards to show layout
 */
export const MultipleCards: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TemplateCard
        title="Next.js Starter"
        description="Full-featured Next.js template"
        image="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80"
        isNew={true}
        onToggleStar={fn()}
        onClick={fn()}
      />
      <TemplateCard
        title="React Dashboard"
        description="Modern dashboard with analytics"
        image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
        isStarred={true}
        onToggleStar={fn()}
        onClick={fn()}
      />
      <TemplateCard
        title="Blank Project"
        description="Start from scratch"
        onToggleStar={fn()}
        onClick={fn()}
      />
    </div>
  ),
};
