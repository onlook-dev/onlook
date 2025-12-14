import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { TemplateCard } from '@/app/projects/_components/templates/template-card';

const meta = {
  component: TemplateCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: 'Title of the template',
      control: 'text',
    },
    description: {
      description: 'Description of the template',
      control: 'text',
    },
    image: {
      description: 'Preview image URL',
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

export const Default: Story = {
  args: {
    title: 'Next.js Starter',
    description: 'A full-featured Next.js template with authentication and database setup.',
    isNew: false,
    isStarred: false,
  },
};

export const New: Story = {
  args: {
    title: 'React Dashboard',
    description: 'Modern dashboard template with charts, tables, and analytics components.',
    isNew: true,
    isStarred: false,
  },
};

export const Starred: Story = {
  args: {
    title: 'E-commerce Store',
    description: 'Complete e-commerce solution with cart, checkout, and payment integration.',
    isNew: false,
    isStarred: true,
  },
};

export const NewAndStarred: Story = {
  args: {
    title: 'SaaS Landing Page',
    description: 'Beautiful landing page template for SaaS products with pricing tables.',
    isNew: true,
    isStarred: true,
  },
};

export const WithImage: Story = {
  args: {
    title: 'Portfolio Template',
    description: 'Showcase your work with this elegant portfolio template.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    isNew: false,
    isStarred: false,
  },
};

export const LongTitle: Story = {
  args: {
    title: 'This is a very long template name that should truncate properly',
    description: 'Short description.',
    isNew: false,
    isStarred: false,
  },
};

export const LongDescription: Story = {
  args: {
    title: 'Blog Template',
    description: 'A comprehensive blog template with markdown support, syntax highlighting, SEO optimization, RSS feeds, and much more for content creators.',
    isNew: false,
    isStarred: false,
  },
};

export const NoStarButton: Story = {
  args: {
    title: 'Basic Template',
    description: 'A simple template without the star/favorite functionality.',
    isNew: false,
    onToggleStar: undefined,
  },
};

export const TemplateGrid: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <TemplateCard
        title="Next.js Starter"
        description="Full-featured Next.js template"
        isNew={true}
        onToggleStar={fn()}
        onClick={fn()}
      />
      <TemplateCard
        title="React Dashboard"
        description="Modern dashboard with analytics"
        isStarred={true}
        onToggleStar={fn()}
        onClick={fn()}
      />
      <TemplateCard
        title="E-commerce Store"
        description="Complete e-commerce solution"
        onToggleStar={fn()}
        onClick={fn()}
      />
    </div>
  ),
};
