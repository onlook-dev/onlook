import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { TemplateCard } from './template-card';

const meta = {
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
      description: 'Brief description of what the template includes',
      control: 'text',
    },
    image: {
      description: 'URL of the template preview image',
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
    onToggleStar: fn(),
    onClick: fn(),
  },
} satisfies Meta<typeof TemplateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Next.js Starter',
    description: 'Full-featured Next.js template with authentication and database integration.',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    isNew: false,
    isStarred: false,
  },
};

export const WithNewBadge: Story = {
  args: {
    title: 'React Dashboard',
    description: 'Modern admin dashboard with charts, tables, and dark mode support.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    isNew: true,
    isStarred: false,
  },
};

export const Starred: Story = {
  args: {
    title: 'E-commerce Template',
    description: 'Complete e-commerce solution with cart, checkout, and payment integration.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isNew: false,
    isStarred: true,
  },
};

export const NewAndStarred: Story = {
  args: {
    title: 'SaaS Landing Page',
    description: 'Beautiful landing page template for SaaS products with pricing tables.',
    image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    isNew: true,
    isStarred: true,
  },
};

export const NoImage: Story = {
  args: {
    title: 'Minimal Blog',
    description: 'Clean and simple blog template with markdown support.',
    image: undefined,
    isNew: false,
    isStarred: false,
  },
};

export const LongContent: Story = {
  args: {
    title: 'Enterprise Application Framework with Advanced Features',
    description: 'A comprehensive enterprise-grade application template featuring role-based access control, multi-tenancy support, advanced analytics dashboard, and seamless third-party integrations.',
    image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    isNew: true,
    isStarred: false,
  },
};

export const WithoutStarButton: Story = {
  args: {
    title: 'Portfolio Template',
    description: 'Showcase your work with this elegant portfolio template.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    isNew: false,
    isStarred: false,
    onToggleStar: undefined,
  },
};
