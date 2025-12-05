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
      description: 'Template title displayed in the card',
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
 * Default template card with image
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
 * Template card marked as new
 */
export const New: Story = {
  args: {
    title: 'React Dashboard',
    description: 'Modern dashboard template with charts, tables, and dark mode support.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    isNew: true,
    isStarred: false,
  },
};

/**
 * Template card that is starred/favorited
 */
export const Starred: Story = {
  args: {
    title: 'E-commerce Store',
    description: 'Complete e-commerce solution with cart, checkout, and payment integration.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isNew: false,
    isStarred: true,
  },
};

/**
 * Template card that is both new and starred
 */
export const NewAndStarred: Story = {
  args: {
    title: 'AI Chat App',
    description: 'Build AI-powered chat applications with streaming responses.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    isNew: true,
    isStarred: true,
  },
};

/**
 * Template card without an image (shows gradient placeholder)
 */
export const NoImage: Story = {
  args: {
    title: 'Blank Project',
    description: 'Start from scratch with a minimal project setup.',
    image: undefined,
    isNew: false,
    isStarred: false,
  },
};

/**
 * Template card with long title and description
 */
export const LongContent: Story = {
  args: {
    title: 'Enterprise Multi-Tenant SaaS Application Template with Advanced Features',
    description: 'A comprehensive template for building enterprise-grade multi-tenant SaaS applications with role-based access control, billing integration, and analytics dashboard.',
    image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    isNew: true,
    isStarred: false,
  },
};

/**
 * Template card without star functionality
 */
export const NoStarButton: Story = {
  args: {
    title: 'Portfolio Site',
    description: 'Personal portfolio template with blog and project showcase.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    isNew: false,
    isStarred: false,
    onToggleStar: undefined,
  },
};

/**
 * All template card variants
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TemplateCard
        title="Default Template"
        description="Standard template card appearance"
        image="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80"
        onClick={fn()}
        onToggleStar={fn()}
      />
      <TemplateCard
        title="New Template"
        description="Template with new badge"
        image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
        isNew
        onClick={fn()}
        onToggleStar={fn()}
      />
      <TemplateCard
        title="Starred Template"
        description="Template marked as favorite"
        image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
        isStarred
        onClick={fn()}
        onToggleStar={fn()}
      />
      <TemplateCard
        title="No Image Template"
        description="Template without preview image"
        onClick={fn()}
        onToggleStar={fn()}
      />
    </div>
  ),
};
