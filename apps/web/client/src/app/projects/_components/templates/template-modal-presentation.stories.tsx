import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { TemplateModalPresentation } from './template-modal-presentation';
import type { Project } from '@onlook/models';

const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: crypto.randomUUID(),
  name: 'Template Project',
  metadata: {
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-11-01'),
    previewImg: {
      type: 'url',
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      updatedAt: new Date(),
    },
    description: 'Template description',
    tags: ['template'],
  },
  ...overrides,
});

const meta = {
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

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Next.js Starter Template',
    description: 'A full-featured Next.js template with authentication, database integration, and a beautiful UI built with TailwindCSS. Perfect for building modern web applications quickly.',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    isNew: false,
    isStarred: false,
    isCreatingProject: false,
    templateProject: createMockProject({
      name: 'Next.js Starter Template',
    }),
  },
};

export const WithNewBadge: Story = {
  args: {
    isOpen: true,
    title: 'React Dashboard Template',
    description: 'Modern admin dashboard with charts, tables, and dark mode support. Includes pre-built components for analytics, user management, and settings pages.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    isNew: true,
    isStarred: false,
    isCreatingProject: false,
    templateProject: createMockProject({
      name: 'React Dashboard Template',
    }),
  },
};

export const Starred: Story = {
  args: {
    isOpen: true,
    title: 'E-commerce Template',
    description: 'Complete e-commerce solution with cart, checkout, and payment integration. Built with Stripe and includes product catalog, inventory management, and order tracking.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isNew: false,
    isStarred: true,
    isCreatingProject: false,
    templateProject: createMockProject({
      name: 'E-commerce Template',
    }),
  },
};

export const NewAndStarred: Story = {
  args: {
    isOpen: true,
    title: 'SaaS Landing Page',
    description: 'Beautiful landing page template for SaaS products with pricing tables, feature sections, testimonials, and newsletter signup. Optimized for conversions.',
    image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    isNew: true,
    isStarred: true,
    isCreatingProject: false,
    templateProject: createMockProject({
      name: 'SaaS Landing Page',
    }),
  },
};

export const CreatingProject: Story = {
  args: {
    isOpen: true,
    title: 'Portfolio Template',
    description: 'Showcase your work with this elegant portfolio template. Includes project gallery, about section, and contact form.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    isNew: false,
    isStarred: false,
    isCreatingProject: true,
    templateProject: createMockProject({
      name: 'Portfolio Template',
    }),
  },
};

export const NoImage: Story = {
  args: {
    isOpen: true,
    title: 'Minimal Blog Template',
    description: 'Clean and simple blog template with markdown support, syntax highlighting, and RSS feed. Perfect for developers and writers.',
    image: null,
    isNew: false,
    isStarred: false,
    isCreatingProject: false,
    templateProject: createMockProject({
      name: 'Minimal Blog Template',
    }),
  },
};

export const LongDescription: Story = {
  args: {
    isOpen: true,
    title: 'Enterprise Application Framework',
    description: 'A comprehensive enterprise-grade application template featuring role-based access control, multi-tenancy support, advanced analytics dashboard, seamless third-party integrations, audit logging, and compliance features. Built with security best practices and scalability in mind. Includes documentation, testing setup, and CI/CD configuration.',
    image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    isNew: true,
    isStarred: false,
    isCreatingProject: false,
    templateProject: createMockProject({
      name: 'Enterprise Application Framework',
    }),
  },
};

export const WithoutStarButton: Story = {
  args: {
    isOpen: true,
    title: 'Documentation Site',
    description: 'Technical documentation platform with search, versioning, and API reference generation.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    isNew: false,
    isStarred: false,
    isCreatingProject: false,
    templateProject: createMockProject({
      name: 'Documentation Site',
    }),
    onToggleStar: undefined,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    title: 'Hidden Template',
    description: 'This modal is closed and should not be visible.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    isNew: false,
    isStarred: false,
    isCreatingProject: false,
    templateProject: createMockProject({
      name: 'Hidden Template',
    }),
  },
};
