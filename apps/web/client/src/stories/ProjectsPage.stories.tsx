import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { TopBarPresentation } from '@/app/projects/_components/top-bar-presentation';
import { SelectProjectPresentation } from '@/app/projects/_components/select-presentation';
import type { Project, User } from '@onlook/models';
import { useState } from 'react';

const ProjectsPageComposed = ({
  user,
  projects,
  isLoading,
  isCreatingProject,
}: {
  user?: User | null;
  projects: Project[];
  isLoading: boolean;
  isCreatingProject: boolean;
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-screen h-screen flex flex-col">
      <TopBarPresentation
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        recentSearches={['dashboard', 'admin', 'portfolio']}
        isCreatingProject={isCreatingProject}
        onCreateBlank={fn()}
        onImport={fn()}
        homeRoute="/"
      />
      <div className="flex justify-center w-full h-full overflow-y-auto overflow-x-visible">
        <SelectProjectPresentation
          allProjects={projects}
          isLoading={isLoading}
          externalSearchQuery={searchQuery}
          isCreatingProject={isCreatingProject}
          onCreateBlank={fn()}
          starredTemplateIds={new Set()}
          onToggleStar={fn()}
          onUnmarkTemplate={fn()}
          onRefetch={fn()}
          onProjectClick={fn()}
          onRenameProject={fn()}
          onCloneProject={fn()}
          onToggleTemplate={fn()}
          onDeleteProject={fn()}
          onUseTemplate={fn()}
          onPreviewTemplate={fn()}
          onEditTemplate={fn()}
          user={user}
        />
      </div>
    </div>
  );
};

const meta = {
  component: ProjectsPageComposed,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isLoading: {
      description: 'Whether projects are loading',
      control: 'boolean',
    },
    isCreatingProject: {
      description: 'Whether a project is being created',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof ProjectsPageComposed>;

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

// Mock user
const mockUser: User = {
  id: 'user-123',
  firstName: 'Jane',
  lastName: 'Doe',
  displayName: 'Jane Doe',
  email: 'jane@example.com',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-11-01'),
  stripeCustomerId: null,
  githubInstallationId: null,
};

// Create diverse mock projects
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
    name: 'Mobile App Design',
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
    name: 'Social Platform',
    metadata: {
      createdAt: new Date('2024-06-18'),
      updatedAt: new Date('2024-10-25'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Community platform with feeds',
      tags: ['social', 'community'],
    },
  }),
  createMockProject({
    name: 'Documentation Site',
    metadata: {
      createdAt: new Date('2024-07-22'),
      updatedAt: new Date('2024-10-20'),
      previewImg: null,
      description: 'Technical documentation platform',
      tags: ['docs', 'markdown'],
    },
  }),
  createMockProject({
    name: 'Admin Tools',
    metadata: {
      createdAt: new Date('2024-08-14'),
      updatedAt: new Date('2024-10-15'),
      previewImg: null,
      description: 'Internal management interface',
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
      description: 'Full-featured Next.js template with auth and database',
      tags: ['template', 'next.js', 'starter'],
    },
  }),
  createMockProject({
    name: 'React Dashboard Template',
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-10-15'),
      previewImg: {
        type: 'url',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
        updatedAt: new Date(),
      },
      description: 'Modern dashboard with charts and tables',
      tags: ['template', 'dashboard', 'react'],
    },
  }),
];

export const Default: Story = {
  args: {
    user: mockUser,
    projects: [...mockProjects, ...templateProjects],
    isLoading: false,
    isCreatingProject: false,
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    projects: [],
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    ...Default.args,
    projects: [],
  },
};

export const CreatingProject: Story = {
  args: {
    ...Default.args,
    projects: mockProjects,
    isCreatingProject: true,
  },
};

export const LoggedOut: Story = {
  args: {
    ...Default.args,
    user: null,
    projects: mockProjects,
  },
};

export const FewProjects: Story = {
  args: {
    ...Default.args,
    projects: mockProjects.slice(0, 3),
  },
};

export const ManyProjects: Story = {
  args: {
    ...Default.args,
    projects: [
      ...mockProjects,
      ...templateProjects,
      ...Array.from({ length: 15 }, (_, i) =>
        createMockProject({
          name: `Generated Project ${i + 1}`,
          metadata: {
            createdAt: new Date(2024, 0, i + 1),
            updatedAt: new Date(2024, 10, i + 1),
            previewImg: i % 3 === 0 ? null : {
              type: 'url',
              url: `https://images.unsplash.com/photo-${1460925895917 + i * 1000}?w=800&q=80`,
              updatedAt: new Date(),
            },
            description: `Auto-generated project ${i + 1} for testing`,
            tags: ['generated', `tag-${i}`],
          },
        }),
      ),
    ],
  },
};

export const NoImages: Story = {
  args: {
    ...Default.args,
    projects: mockProjects.map((p) => ({
      ...p,
      metadata: {
        ...p.metadata,
        previewImg: null,
      },
    })),
  },
};

export const OnlyTemplates: Story = {
  args: {
    ...Default.args,
    projects: templateProjects,
  },
};

export const MinimalUser: Story = {
  args: {
    ...Default.args,
    user: {
      id: 'user-456',
      firstName: null,
      lastName: null,
      displayName: null,
      email: 'newuser@example.com',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: null,
      githubInstallationId: null,
    },
    projects: mockProjects.slice(0, 2),
  },
};

export const Playground: Story = {
  args: {
    ...Default.args,
  },
};
