import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { TemplateModalPresentation } from '@/app/projects/_components/templates/template-modal-presentation';
import type { Project } from '@onlook/models';

/**
 * TemplateModalPresentation displays a modal with template details,
 * preview image, and action buttons for using, previewing, or editing the template.
 */
const meta = {
  title: 'Projects/TemplateModal',
  component: TemplateModalPresentation,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      description: 'Whether the modal is open',
      control: 'boolean',
    },
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
      description: 'Whether the template is starred',
      control: 'boolean',
    },
    isCreatingProject: {
      description: 'Whether a project is being created from this template',
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
  id: 'template-123',
  name: 'Template Project',
  metadata: {
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-11-01'),
    previewImg: null,
    description: 'Template description',
    tags: ['template'],
  },
  ...overrides,
});

/**
 * Default open modal with template details
 */
export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Next.js Starter Template',
    description: 'A comprehensive Next.js starter template with authentication, database integration, and a beautiful UI. Perfect for building modern web applications quickly.',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    isNew: false,
    isStarred: false,
    isCreatingProject: false,
    templateProject: createMockProject(),
  },
};

/**
 * Modal with "New" badge
 */
export const NewTemplate: Story = {
  args: {
    ...Default.args,
    title: 'React Dashboard Pro',
    description: 'A professional dashboard template with charts, analytics, and data visualization components. Includes dark mode support and responsive design.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    isNew: true,
    templateProject: createMockProject({ name: 'React Dashboard Pro' }),
  },
};

/**
 * Modal with starred template
 */
export const StarredTemplate: Story = {
  args: {
    ...Default.args,
    title: 'E-commerce Starter',
    description: 'Complete e-commerce solution with product listings, shopping cart, checkout flow, and payment integration. Built with best practices for performance and SEO.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isStarred: true,
    templateProject: createMockProject({ name: 'E-commerce Starter' }),
  },
};

/**
 * Modal without preview image
 */
export const NoImage: Story = {
  args: {
    ...Default.args,
    title: 'Blank Starter',
    description: 'A minimal starter template for those who want to build from scratch. Includes basic configuration and folder structure.',
    image: null,
    templateProject: createMockProject({ name: 'Blank Starter' }),
  },
};

/**
 * Modal in creating state (loading)
 */
export const Creating: Story = {
  args: {
    ...Default.args,
    title: 'Portfolio Template',
    description: 'Showcase your work with this beautiful portfolio template. Features smooth animations, project galleries, and contact forms.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    isCreatingProject: true,
    templateProject: createMockProject({ name: 'Portfolio Template' }),
  },
};

/**
 * Modal with new and starred badges
 */
export const NewAndStarred: Story = {
  args: {
    ...Default.args,
    title: 'Featured Template',
    description: 'Our most popular template featuring everything you need to build a modern web application. Regularly updated with new features.',
    image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    isNew: true,
    isStarred: true,
    templateProject: createMockProject({ name: 'Featured Template' }),
  },
};

/**
 * Modal without star functionality
 */
export const WithoutStarButton: Story = {
  args: {
    isOpen: true,
    title: 'Simple Template',
    description: 'A straightforward template without favorite functionality.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    isNew: false,
    isStarred: false,
    isCreatingProject: false,
    templateProject: createMockProject({ name: 'Simple Template' }),
    onClose: fn(),
    onToggleStar: undefined,
    onUseTemplate: fn(),
    onPreviewTemplate: fn(),
    onEditTemplate: fn(),
    onUnmarkTemplate: fn(),
  },
};

/**
 * Closed modal (not visible)
 */
export const Closed: Story = {
  args: {
    ...Default.args,
    isOpen: false,
  },
};
