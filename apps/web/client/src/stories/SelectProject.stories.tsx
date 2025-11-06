import type { Meta, StoryObj } from '@storybook/react';
import { SelectProjectPresentation } from '@/app/projects/_components/select-presentation';
import type { Project } from '@onlook/models';
import { fn } from '@storybook/test';

/**
 * SelectProject displays the main project selection interface with recent projects carousel,
 * templates section, and a full projects grid/masonry layout.
 */
const meta = {
  title: 'Projects/SelectProject',
  component: SelectProjectPresentation,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isLoading: {
      control: 'boolean',
      description: 'Whether projects are loading',
    },
    externalSearchQuery: {
      control: 'text',
      description: 'Search query from parent component',
    },
    isCreatingProject: {
      control: 'boolean',
      description: 'Whether a project is being created',
    },
  },
} satisfies Meta<typeof SelectProjectPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create mock projects
const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: crypto.randomUUID(),
  name: 'Project Name',
  metadata: {
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-11-01'),
    previewImg: {
      type: 'url',
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      updatedAt: new Date(),
    },
    description: 'Project description',
    tags: [],
  },
  ...overrides,
});

// Create a set of diverse mock projects
const mockProjects: Project[] = [
  createMockProject({
    name: 'E-commerce Dashboard',
    metadata: {
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-11-03'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Modern admin dashboard for online store',
      tags: ['react', 'typescript', 'tailwind'],
    },
  }),
  createMockProject({
    name: 'Portfolio Website',
    metadata: {
      createdAt: new Date('2024-02-20'),
      updatedAt: new Date('2024-11-02'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Personal portfolio with blog',
      tags: ['next.js', 'blog'],
    },
  }),
  createMockProject({
    name: 'Landing Page',
    metadata: {
      createdAt: new Date('2024-03-10'),
      updatedAt: new Date('2024-11-01'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Marketing site for SaaS product',
      tags: ['marketing', 'saas'],
    },
  }),
  createMockProject({
    name: 'Analytics Platform',
    metadata: {
      createdAt: new Date('2024-04-05'),
      updatedAt: new Date('2024-10-30'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Data visualization and analytics',
      tags: ['analytics', 'charts'],
    },
  }),
  createMockProject({
    name: 'Mobile App',
    metadata: {
      createdAt: new Date('2024-05-12'),
      updatedAt: new Date('2024-10-28'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Mobile-first design system',
      tags: ['mobile', 'react-native'],
    },
  }),
  createMockProject({
    name: 'Social Network',
    metadata: {
      createdAt: new Date('2024-06-18'),
      updatedAt: new Date('2024-10-25'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Community platform',
      tags: ['social', 'community'],
    },
  }),
  createMockProject({
    name: 'Docs Site',
    metadata: {
      createdAt: new Date('2024-07-22'),
      updatedAt: new Date('2024-10-20'),
      previewImg: null,
      description: 'Documentation platform',
      tags: ['docs', 'markdown'],
    },
  }),
  createMockProject({
    name: 'Admin Panel',
    metadata: {
      createdAt: new Date('2024-08-14'),
      updatedAt: new Date('2024-10-15'),
      previewImg: null,
      description: 'Internal admin tools',
      tags: ['admin', 'internal'],
    },
  }),
];

// Template projects
const templateProjects: Project[] = [
  createMockProject({
    name: 'Next.js Starter',
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-11-01'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Full-featured Next.js template',
      tags: ['template', 'next.js'],
    },
  }),
  createMockProject({
    name: 'React Dashboard',
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-10-15'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Modern dashboard template',
      tags: ['template', 'dashboard'],
    },
  }),
];

// Action callbacks
const onCreateBlank = fn();
const onToggleStar = fn();
const onUnmarkTemplate = fn();
const onRefetch = fn();
const onProjectClick = fn();
const onRenameProject = fn();
const onCloneProject = fn();
const onToggleTemplate = fn();
const onDeleteProject = fn();
const onUseTemplate = fn();
const onPreviewTemplate = fn();
const onEditTemplate = fn();

/**
 * Default view with several projects
 */
export const Default: Story = {
  args: {
    allProjects: [...mockProjects, ...templateProjects],
    isLoading: false,
    externalSearchQuery: '',
    isCreatingProject: false,
    onCreateBlank,
    starredTemplateIds: new Set(templateProjects[0] ? [templateProjects[0].id] : []),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
    user: {
      id: 'user-123',
      email: 'user@example.com',
    },
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    allProjects: [],
    isLoading: true,
    externalSearchQuery: '',
    isCreatingProject: false,
    onCreateBlank,
  },
};

/**
 * Empty state (no projects)
 */
export const Empty: Story = {
  args: {
    allProjects: [],
    isLoading: false,
    externalSearchQuery: '',
    isCreatingProject: false,
    onCreateBlank,
    starredTemplateIds: new Set(),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
  },
};

/**
 * Creating a new project
 */
export const CreatingProject: Story = {
  args: {
    allProjects: mockProjects,
    isLoading: false,
    externalSearchQuery: '',
    isCreatingProject: true,
    onCreateBlank,
    starredTemplateIds: new Set(),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
  },
};

/**
 * With search results
 */
export const WithSearch: Story = {
  args: {
    allProjects: [...mockProjects, ...templateProjects],
    isLoading: false,
    externalSearchQuery: 'dashboard',
    isCreatingProject: false,
    onCreateBlank,
    starredTemplateIds: new Set(),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
  },
};

/**
 * Search with no results
 */
export const NoSearchResults: Story = {
  args: {
    allProjects: mockProjects,
    isLoading: false,
    externalSearchQuery: 'nonexistent project name xyz',
    isCreatingProject: false,
    onCreateBlank,
    starredTemplateIds: new Set(),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
  },
};

/**
 * Few projects (2-3)
 */
export const FewProjects: Story = {
  args: {
    allProjects: mockProjects.slice(0, 3),
    isLoading: false,
    externalSearchQuery: '',
    isCreatingProject: false,
    onCreateBlank,
    starredTemplateIds: new Set(),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
  },
};

/**
 * Many projects
 */
export const ManyProjects: Story = {
  args: {
    allProjects: [
      ...mockProjects,
      ...Array.from({ length: 20 }, (_, i) =>
        createMockProject({
          name: `Project ${i + 9}`,
          metadata: {
            createdAt: new Date(2024, 0, i + 1),
            updatedAt: new Date(2024, 10, i + 1),
            previewImg: i % 3 === 0 ? null : {
              type: 'url',
              url: `https://images.unsplash.com/photo-${1460925895917 + i}?w=800&q=80`,
              updatedAt: new Date(),
            },
            description: `Description for project ${i + 9}`,
            tags: ['tag1', 'tag2'],
          },
        }),
      ),
      ...templateProjects,
    ],
    isLoading: false,
    externalSearchQuery: '',
    isCreatingProject: false,
    onCreateBlank,
    starredTemplateIds: new Set([templateProjects[0]?.id, templateProjects[1]?.id].filter(Boolean) as string[]),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
  },
};

/**
 * With templates but no regular projects
 */
export const OnlyTemplates: Story = {
  args: {
    allProjects: templateProjects,
    isLoading: false,
    externalSearchQuery: '',
    isCreatingProject: false,
    onCreateBlank,
    starredTemplateIds: new Set(templateProjects[0] ? [templateProjects[0].id] : []),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
  },
};

/**
 * Projects without images
 */
export const NoImages: Story = {
  args: {
    allProjects: mockProjects.map((p) => ({
      ...p,
      metadata: {
        ...p.metadata,
        previewImg: null,
      },
    })),
    isLoading: false,
    externalSearchQuery: '',
    isCreatingProject: false,
    onCreateBlank,
    starredTemplateIds: new Set(),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
  },
};

/**
 * Interactive playground
 */
export const Playground: Story = {
  args: {
    allProjects: [...mockProjects, ...templateProjects],
    isLoading: false,
    externalSearchQuery: '',
    isCreatingProject: false,
    onCreateBlank,
    starredTemplateIds: new Set(templateProjects[0] ? [templateProjects[0].id] : []),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
    user: {
      id: 'user-123',
      email: 'user@example.com',
    },
  },
};
