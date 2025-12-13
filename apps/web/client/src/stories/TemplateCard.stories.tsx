import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { TemplateCard } from '@/app/projects/_components/templates/template-card';

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
    description: 'A full-featured Next.js template with authentication and database integration.',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    isNew: false,
    isStarred: false,
  },
};

export const WithNewBadge: Story = {
  args: {
    title: 'React Dashboard',
    description: 'Modern dashboard template with charts, tables, and analytics components.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    isNew: true,
    isStarred: false,
  },
};

export const Starred: Story = {
  args: {
    title: 'Portfolio Template',
    description: 'Clean and minimal portfolio template for showcasing your work.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    isNew: false,
    isStarred: true,
  },
};

export const NewAndStarred: Story = {
  args: {
    title: 'E-commerce Starter',
    description: 'Complete e-commerce solution with cart, checkout, and payment integration.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isNew: true,
    isStarred: true,
  },
};

export const NoImage: Story = {
  args: {
    title: 'Blank Template',
    description: 'Start from scratch with a minimal setup.',
    image: undefined,
    isNew: false,
    isStarred: false,
  },
};

export const LongTitle: Story = {
  args: {
    title: 'Super Long Template Name That Should Truncate Properly',
    description: 'A template with a very long name to test truncation behavior.',
    image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    isNew: false,
    isStarred: false,
  },
};

export const LongDescription: Story = {
  args: {
    title: 'Documentation Site',
    description: 'A comprehensive documentation template with search functionality, versioning support, multiple language support, and beautiful syntax highlighting for code blocks.',
    image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    isNew: false,
    isStarred: false,
  },
};

export const WithoutStarButton: Story = {
  args: {
    title: 'Simple Template',
    description: 'A template without the star/favorite functionality.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    isNew: false,
    isStarred: false,
    onToggleStar: undefined,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TemplateCard
        title="Default Template"
        description="Standard template without any badges."
        image="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80"
        onClick={fn()}
        onToggleStar={fn()}
      />
      <TemplateCard
        title="New Template"
        description="Template with the new badge."
        image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
        isNew
        onClick={fn()}
        onToggleStar={fn()}
      />
      <TemplateCard
        title="Starred Template"
        description="Template that has been favorited."
        image="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"
        isStarred
        onClick={fn()}
        onToggleStar={fn()}
      />
      <TemplateCard
        title="No Image Template"
        description="Template without a preview image."
        onClick={fn()}
        onToggleStar={fn()}
      />
    </div>
  ),
};
