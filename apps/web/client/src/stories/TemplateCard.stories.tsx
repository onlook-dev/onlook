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
      description: 'Image URL for the template preview',
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
    description: 'A full-featured Next.js template with authentication and database.',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    isNew: false,
    isStarred: false,
  },
};

export const New: Story = {
  args: {
    title: 'React Dashboard',
    description: 'Modern dashboard template with charts and analytics.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    isNew: true,
    isStarred: false,
  },
};

export const Starred: Story = {
  args: {
    title: 'Portfolio Template',
    description: 'Clean and minimal portfolio design for developers.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    isNew: false,
    isStarred: true,
  },
};

export const NewAndStarred: Story = {
  args: {
    title: 'E-commerce Starter',
    description: 'Complete e-commerce solution with cart and checkout.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isNew: true,
    isStarred: true,
  },
};

export const NoImage: Story = {
  args: {
    title: 'Blank Template',
    description: 'Start from scratch with a minimal setup.',
    image: '/assets/site-version-1.png',
    isNew: false,
    isStarred: false,
  },
};

export const LongContent: Story = {
  args: {
    title: 'This is a very long template name that should truncate',
    description: 'This is a very long description that explains all the features of this template in great detail and should also truncate properly.',
    image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    isNew: true,
    isStarred: false,
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TemplateCard
        title="Default Template"
        description="A standard template without any badges."
        image="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80"
      />
      <TemplateCard
        title="New Template"
        description="A newly added template."
        image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
        isNew
      />
      <TemplateCard
        title="Starred Template"
        description="A favorited template."
        image="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"
        isStarred
        onToggleStar={fn()}
      />
    </div>
  ),
};
