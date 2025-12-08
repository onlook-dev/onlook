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
      description: 'Description of the template',
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
    title: 'Dashboard Template',
    description: 'A modern dashboard template with charts, tables, and analytics components.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    isNew: false,
    isStarred: false,
  },
};

export const WithNewBadge: Story = {
  args: {
    ...Default.args,
    isNew: true,
  },
};

export const Starred: Story = {
  args: {
    ...Default.args,
    isStarred: true,
  },
};

export const NewAndStarred: Story = {
  args: {
    ...Default.args,
    isNew: true,
    isStarred: true,
  },
};

export const NoImage: Story = {
  args: {
    ...Default.args,
    image: undefined,
  },
};

export const LongTitle: Story = {
  args: {
    ...Default.args,
    title: 'This is a very long template title that should be truncated properly',
  },
};

export const LongDescription: Story = {
  args: {
    ...Default.args,
    description: 'This is a very long description that explains all the features of this template including charts, tables, forms, authentication, and many more components that make this template great for building modern web applications.',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TemplateCard
        title="Basic Template"
        description="A simple starter template"
        isNew={false}
        isStarred={false}
      />
      <TemplateCard
        title="New Template"
        description="Just released this week"
        isNew={true}
        isStarred={false}
      />
      <TemplateCard
        title="Favorite Template"
        description="Your starred template"
        isNew={false}
        isStarred={true}
        onToggleStar={() => {}}
      />
    </div>
  ),
};
