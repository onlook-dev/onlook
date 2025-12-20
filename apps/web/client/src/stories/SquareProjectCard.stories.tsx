import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { SquareProjectCardPresentation } from '@/app/projects/_components/select/square-project-card-presentation';
import { HighlightText } from '@/app/projects/_components/select/highlight-text';
import type { Project } from '@onlook/models';

/**
 * SquareProjectCardPresentation displays a project card with a square aspect ratio,
 * preview image, project name, and last updated time.
 */
const meta = {
  title: 'Projects/SquareProjectCard',
  component: SquareProjectCardPresentation,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[280px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    imageUrl: {
      description: 'Pre-resolved image URL for the project preview',
      control: 'text',
    },
    searchQuery: {
      description: 'Search query to highlight in project name',
      control: 'text',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof SquareProjectCardPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: 'proj-123',
  name: 'E-commerce Dashboard',
  metadata: {
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    previewImg: {
      type: 'url',
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      updatedAt: new Date(),
    },
    description: 'Modern dashboard for managing online store',
    tags: ['react', 'next.js', 'tailwind'],
  },
  ...overrides,
});

/**
 * Default project card with image preview
 */
export const Default: Story = {
  args: {
    project: createMockProject(),
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    searchQuery: '',
    HighlightText,
  },
};

/**
 * Project card without a preview image
 */
export const NoImage: Story = {
  args: {
    project: createMockProject({
      name: 'New Blank Project',
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        previewImg: null,
        description: 'Fresh project ready for development',
        tags: ['blank'],
      },
    }),
    imageUrl: null,
    searchQuery: '',
    HighlightText,
  },
};

/**
 * Recently updated project
 */
export const RecentlyUpdated: Story = {
  args: {
    project: createMockProject({
      name: 'Portfolio Site',
      metadata: {
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        previewImg: {
          type: 'url',
          url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
          updatedAt: new Date(),
        },
        description: 'Personal portfolio with Next.js',
        tags: ['portfolio', 'personal'],
      },
    }),
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    searchQuery: '',
    HighlightText,
  },
};

/**
 * Project card with search highlighting
 */
export const WithSearchHighlight: Story = {
  args: {
    project: createMockProject({
      name: 'Dashboard Analytics',
      metadata: {
        createdAt: new Date('2024-08-01'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        previewImg: {
          type: 'url',
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
          updatedAt: new Date(),
        },
        description: 'Real-time dashboard for analytics',
        tags: ['analytics', 'dashboard'],
      },
    }),
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    searchQuery: 'dash',
    HighlightText,
  },
};

/**
 * Project card with long name
 */
export const LongName: Story = {
  args: {
    project: createMockProject({
      name: 'Super Long Project Name That Should Truncate When Displayed',
      metadata: {
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        previewImg: {
          type: 'url',
          url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
          updatedAt: new Date(),
        },
        description: 'Project with a very long name',
        tags: ['test'],
      },
    }),
    imageUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    searchQuery: '',
    HighlightText,
  },
};

/**
 * Project card without click handler (no edit button overlay)
 */
export const WithoutClickHandler: Story = {
  args: {
    project: createMockProject({
      name: 'View Only Project',
    }),
    imageUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    searchQuery: '',
    HighlightText,
    onClick: undefined,
  },
};

/**
 * Multiple project cards in a grid
 */
export const MultipleCards: Story = {
  args: {
    project: createMockProject(),
    imageUrl: null,
    searchQuery: '',
    HighlightText,
  },
  decorators: [
    (Story) => (
      <div className="grid grid-cols-2 gap-4 w-[600px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <SquareProjectCardPresentation
        project={createMockProject({ name: 'Project One' })}
        imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
        HighlightText={HighlightText}
        onClick={fn()}
      />
      <SquareProjectCardPresentation
        project={createMockProject({ name: 'Project Two' })}
        imageUrl="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"
        HighlightText={HighlightText}
        onClick={fn()}
      />
      <SquareProjectCardPresentation
        project={createMockProject({ name: 'Project Three' })}
        imageUrl={null}
        HighlightText={HighlightText}
        onClick={fn()}
      />
      <SquareProjectCardPresentation
        project={createMockProject({ name: 'Project Four' })}
        imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
        HighlightText={HighlightText}
        onClick={fn()}
      />
    </>
  ),
};
