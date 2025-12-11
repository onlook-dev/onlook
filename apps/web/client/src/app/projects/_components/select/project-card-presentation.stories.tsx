import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import type { Project } from '@onlook/models';
import { ProjectCardPresentation } from './project-card-presentation';
import { HighlightText } from './highlight-text';

const meta = {
  component: ProjectCardPresentation,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    imageUrl: {
      description: 'Pre-resolved image URL for the project preview',
      control: 'text',
    },
    aspectRatio: {
      description: 'Aspect ratio class for the card',
      control: { type: 'select' },
      options: ['aspect-[4/2.6]', 'aspect-[4/2.8]', 'aspect-square', 'aspect-video'],
    },
    searchQuery: {
      description: 'Search query to highlight in project name',
      control: 'text',
    },
    isTemplate: {
      description: 'Whether this project is a template',
      control: 'boolean',
    },
  },
  args: {
    onEdit: fn(),
    onRename: fn(),
    onClone: fn(),
    onToggleTemplate: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProjectCardPresentation>;

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
    aspectRatio: 'aspect-[4/2.6]',
    searchQuery: '',
    HighlightText,
    isTemplate: false,
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
    aspectRatio: 'aspect-[4/2.6]',
    searchQuery: '',
    HighlightText,
    isTemplate: false,
  },
};

export const WithSearchHighlight: Story = {
  args: {
    project: createMockProject({
      name: 'Dashboard Analytics',
    }),
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    aspectRatio: 'aspect-[4/2.6]',
    searchQuery: 'dash',
    HighlightText,
    isTemplate: false,
  },
};

export const AsTemplate: Story = {
  args: {
    project: createMockProject({
      name: 'Landing Page Template',
    }),
    imageUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
    aspectRatio: 'aspect-[4/2.6]',
    searchQuery: '',
    HighlightText,
    isTemplate: true,
  },
};

export const SquareAspect: Story = {
  args: {
    project: createMockProject({
      name: 'Mobile App Design',
    }),
    imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    aspectRatio: 'aspect-square',
    searchQuery: '',
    HighlightText,
    isTemplate: false,
  },
};

export const WideAspect: Story = {
  args: {
    project: createMockProject({
      name: 'Marketing Landing Page',
    }),
    imageUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    aspectRatio: 'aspect-video',
    searchQuery: '',
    HighlightText,
    isTemplate: false,
  },
};

export const LongProjectName: Story = {
  args: {
    project: createMockProject({
      name: 'Super Long Project Name That Should Truncate When Displayed In The Card',
    }),
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    aspectRatio: 'aspect-[4/2.6]',
    searchQuery: '',
    HighlightText,
    isTemplate: false,
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
    imageUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80',
    aspectRatio: 'aspect-[4/2.6]',
    searchQuery: '',
    HighlightText,
    isTemplate: false,
  },
};

export const MinimalActions: Story = {
  args: {
    project: createMockProject({
      name: 'View Only Project',
    }),
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    aspectRatio: 'aspect-[4/2.6]',
    searchQuery: '',
    HighlightText,
    isTemplate: false,
    onEdit: fn(),
    onRename: undefined,
    onClone: undefined,
    onToggleTemplate: undefined,
    onDelete: undefined,
  },
};

export const AllVariants: Story = {
  args: {
    project: createMockProject(),
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    aspectRatio: 'aspect-[4/2.6]',
    searchQuery: '',
    HighlightText,
    isTemplate: false,
  },
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <ProjectCardPresentation
        project={createMockProject({ name: 'With Image' })}
        imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
        HighlightText={HighlightText}
        onEdit={fn()}
        onRename={fn()}
        onClone={fn()}
        onDelete={fn()}
      />
      <ProjectCardPresentation
        project={createMockProject({ name: 'No Image' })}
        imageUrl={null}
        HighlightText={HighlightText}
        onEdit={fn()}
        onRename={fn()}
        onClone={fn()}
        onDelete={fn()}
      />
      <ProjectCardPresentation
        project={createMockProject({ name: 'Template Project' })}
        imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
        HighlightText={HighlightText}
        isTemplate
        onEdit={fn()}
        onToggleTemplate={fn()}
      />
      <ProjectCardPresentation
        project={createMockProject({ name: 'Dashboard Project' })}
        imageUrl="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"
        searchQuery="dash"
        HighlightText={HighlightText}
        onEdit={fn()}
        onRename={fn()}
        onClone={fn()}
        onDelete={fn()}
      />
    </div>
  ),
};
