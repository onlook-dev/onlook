import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import type { Project } from '@onlook/models';
import { SquareProjectCardPresentation } from './square-project-card-presentation';
import { HighlightText } from './highlight-text';

const meta = {
  component: SquareProjectCardPresentation,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
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
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SquareProjectCardPresentation>;

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
    project: createMockProject(),
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    searchQuery: '',
    HighlightText,
  },
};

export const NoImage: Story = {
  args: {
    project: createMockProject({
      name: 'New Blank Project',
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        previewImg: null,
        description: 'Fresh project ready for development',
        tags: [],
      },
    }),
    imageUrl: null,
    searchQuery: '',
    HighlightText,
  },
};

export const WithSearchHighlight: Story = {
  args: {
    project: createMockProject({
      name: 'Dashboard Analytics',
    }),
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    searchQuery: 'dash',
    HighlightText,
  },
};

export const RecentlyUpdated: Story = {
  args: {
    project: createMockProject({
      name: 'Portfolio Site',
      metadata: {
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date(Date.now() - 2 * 60 * 1000),
        previewImg: null,
        description: 'Personal portfolio with Next.js',
        tags: ['portfolio'],
      },
    }),
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    searchQuery: '',
    HighlightText,
  },
};

export const LongProjectName: Story = {
  args: {
    project: createMockProject({
      name: 'Super Long Project Name That Should Truncate When Displayed',
    }),
    imageUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    searchQuery: '',
    HighlightText,
  },
};

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

export const AllVariants: Story = {
  args: {
    project: createMockProject(),
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    searchQuery: '',
    HighlightText,
  },
  decorators: [
    (Story) => (
      <div className="w-[700px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <SquareProjectCardPresentation
        project={createMockProject({ name: 'With Image' })}
        imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
        HighlightText={HighlightText}
        onClick={fn()}
      />
      <SquareProjectCardPresentation
        project={createMockProject({ name: 'No Image' })}
        imageUrl={null}
        HighlightText={HighlightText}
        onClick={fn()}
      />
      <SquareProjectCardPresentation
        project={createMockProject({ name: 'Dashboard Project' })}
        imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
        searchQuery="dash"
        HighlightText={HighlightText}
        onClick={fn()}
      />
      <SquareProjectCardPresentation
        project={createMockProject({ name: 'Very Long Project Name Here' })}
        imageUrl="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"
        HighlightText={HighlightText}
        onClick={fn()}
      />
    </div>
  ),
};
