import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { SquareProjectCardPresentation } from './square-project-card-presentation';
import type { Project } from '@onlook/models';

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

const MockHighlightText = ({ text, searchQuery }: { text: string; searchQuery: string }) => {
  if (!searchQuery) return <>{text}</>;
  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <span key={i} className="bg-yellow-500/50 text-white">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

const meta = {
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
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    imageUrl: {
      description: 'Resolved image URL for the project preview',
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

export const Default: Story = {
  args: {
    project: createMockProject({
      name: 'E-commerce Dashboard',
      metadata: {
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        previewImg: {
          type: 'url',
          url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
          updatedAt: new Date(),
        },
        description: 'Modern admin dashboard',
        tags: ['react', 'typescript'],
      },
    }),
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    searchQuery: '',
  },
};

export const WithSearchHighlight: Story = {
  args: {
    project: createMockProject({
      name: 'Dashboard Project',
      metadata: {
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 30),
        previewImg: {
          type: 'url',
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
          updatedAt: new Date(),
        },
        description: 'Analytics dashboard',
        tags: ['analytics'],
      },
    }),
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    searchQuery: 'Dashboard',
    HighlightText: MockHighlightText,
  },
};

export const NoImage: Story = {
  args: {
    project: createMockProject({
      name: 'Documentation Site',
      metadata: {
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        previewImg: null,
        description: 'Technical documentation',
        tags: ['docs'],
      },
    }),
    imageUrl: null,
    searchQuery: '',
  },
};

export const LongProjectName: Story = {
  args: {
    project: createMockProject({
      name: 'Enterprise Application Framework with Advanced Features and Integrations',
      metadata: {
        createdAt: new Date('2024-04-05'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        previewImg: {
          type: 'url',
          url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
          updatedAt: new Date(),
        },
        description: 'Enterprise solution',
        tags: ['enterprise'],
      },
    }),
    imageUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    searchQuery: '',
  },
};

export const RecentlyUpdated: Story = {
  args: {
    project: createMockProject({
      name: 'Active Project',
      metadata: {
        createdAt: new Date('2024-05-12'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 5),
        previewImg: {
          type: 'url',
          url: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
          updatedAt: new Date(),
        },
        description: 'Recently updated project',
        tags: ['active'],
      },
    }),
    imageUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    searchQuery: '',
  },
};

export const WithoutClickHandler: Story = {
  args: {
    project: createMockProject({
      name: 'Read-only Project',
      metadata: {
        createdAt: new Date('2024-06-18'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
        previewImg: {
          type: 'url',
          url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
          updatedAt: new Date(),
        },
        description: 'View-only project',
        tags: ['readonly'],
      },
    }),
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    searchQuery: '',
    onClick: undefined,
  },
};
