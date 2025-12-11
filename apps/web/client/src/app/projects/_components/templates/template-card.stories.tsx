import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { TemplateCard } from './template-card';

const meta = {
  component: TemplateCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: 'The title of the template',
      control: 'text',
    },
    description: {
      description: 'A brief description of the template',
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
    onClick: fn(),
    onToggleStar: fn(),
  },
} satisfies Meta<typeof TemplateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'E-commerce Dashboard',
    description: 'A modern dashboard template for managing online stores with analytics and inventory tracking.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isNew: false,
    isStarred: false,
  },
};

export const NewTemplate: Story = {
  args: {
    ...Default.args,
    title: 'AI Chat Interface',
    description: 'A sleek chat interface template with AI integration capabilities.',
    isNew: true,
  },
};

export const Starred: Story = {
  args: {
    ...Default.args,
    title: 'Portfolio Site',
    description: 'A beautiful portfolio template for showcasing your work.',
    isStarred: true,
  },
};

export const NoImage: Story = {
  args: {
    ...Default.args,
    title: 'Blank Template',
    description: 'Start from scratch with this minimal template.',
    image: '/assets/site-version-1.png',
  },
};

export const LongTitle: Story = {
  args: {
    ...Default.args,
    title: 'This Is A Very Long Template Name That Should Truncate Properly',
    description: 'Testing how the card handles long titles.',
  },
};

export const LongDescription: Story = {
  args: {
    ...Default.args,
    title: 'Landing Page',
    description: 'This is a very long description that tests how the template card handles overflow text. It should be truncated with ellipsis after two lines to maintain a clean appearance.',
  },
};

export const WithoutStarButton: Story = {
  args: {
    title: 'Simple Template',
    description: 'A template without the star/favorite functionality.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    isNew: false,
    isStarred: false,
    onClick: fn(),
    onToggleStar: undefined,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TemplateCard
        title="Default Template"
        description="A standard template card."
        image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
      />
      <TemplateCard
        title="New Template"
        description="A template with the new badge."
        image="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"
        isNew
      />
      <TemplateCard
        title="Starred Template"
        description="A favorited template."
        image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
        isStarred
        onToggleStar={fn()}
      />
      <TemplateCard
        title="No Image Template"
        description="A template without a preview image."
      />
    </div>
  ),
};
