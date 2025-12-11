import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import type { Project } from '@onlook/models';
import { TemplateModalPresentation } from './template-modal-presentation';

const meta = {
  component: TemplateModalPresentation,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      description: 'Whether the modal is open',
      control: 'boolean',
    },
    title: {
      description: 'The title of the template',
      control: 'text',
    },
    description: {
      description: 'A description of the template',
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
    isCreatingProject: {
      description: 'Whether a project is currently being created',
      control: 'boolean',
    },
  },
  args: {
    onClose: fn(),
    onToggleStar: fn(),
    onUseTemplate: fn(),
    onPreviewTemplate: fn(),
    onEditTemplate: fn(),
    onUnmarkTemplate: fn(),
  },
} satisfies Meta<typeof TemplateModalPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: 'proj-123',
  name: 'E-commerce Dashboard',
  metadata: {
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    previewImg: null,
    description: 'Modern dashboard for managing online store',
    tags: ['react', 'next.js', 'tailwind'],
  },
  ...overrides,
});

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'E-commerce Dashboard',
    description: 'A modern dashboard template for managing online stores. Includes analytics, inventory tracking, order management, and customer insights. Built with React, Next.js, and TailwindCSS.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isNew: false,
    isStarred: false,
    templateProject: createMockProject(),
    isCreatingProject: false,
  },
};

export const NewTemplate: Story = {
  args: {
    ...Default.args,
    title: 'AI Chat Interface',
    description: 'A sleek chat interface template with AI integration capabilities. Perfect for building chatbots, customer support systems, or AI assistants.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    isNew: true,
    templateProject: createMockProject({ name: 'AI Chat Interface' }),
  },
};

export const Starred: Story = {
  args: {
    ...Default.args,
    title: 'Portfolio Site',
    description: 'A beautiful portfolio template for showcasing your work. Features smooth animations, responsive design, and easy customization.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    isStarred: true,
    templateProject: createMockProject({ name: 'Portfolio Site' }),
  },
};

export const NoImage: Story = {
  args: {
    ...Default.args,
    title: 'Blank Template',
    description: 'Start from scratch with this minimal template. Perfect for custom projects where you want full control over the design.',
    image: null,
    templateProject: createMockProject({ name: 'Blank Template' }),
  },
};

export const CreatingProject: Story = {
  args: {
    ...Default.args,
    title: 'Landing Page',
    description: 'A high-converting landing page template with hero section, features grid, testimonials, and call-to-action sections.',
    image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    isCreatingProject: true,
    templateProject: createMockProject({ name: 'Landing Page' }),
  },
};

export const WithoutStarButton: Story = {
  args: {
    isOpen: true,
    title: 'Simple Template',
    description: 'A template without the star/favorite functionality.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    isNew: false,
    isStarred: false,
    templateProject: createMockProject({ name: 'Simple Template' }),
    isCreatingProject: false,
    onClose: fn(),
    onToggleStar: undefined,
    onUseTemplate: fn(),
    onPreviewTemplate: fn(),
  },
};

export const MinimalActions: Story = {
  args: {
    isOpen: true,
    title: 'View Only Template',
    description: 'A template with minimal action buttons.',
    image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    isNew: false,
    isStarred: false,
    templateProject: createMockProject({ name: 'View Only Template' }),
    isCreatingProject: false,
    onClose: fn(),
    onUseTemplate: fn(),
    onToggleStar: undefined,
    onPreviewTemplate: undefined,
    onEditTemplate: undefined,
    onUnmarkTemplate: undefined,
  },
};

export const Closed: Story = {
  args: {
    ...Default.args,
    isOpen: false,
  },
};
