import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { ProjectCardPresentation } from './project-card-presentation';
import { HighlightText } from './highlight-text';
import type { Project } from '@onlook/models';

const mockProject: Project = {
  id: 'project-1',
  name: 'Dashboard App',
  sandboxId: 'sandbox-1',
  sandboxUrl: 'https://example.codesandbox.io',
  metadata: {
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    previewImg: null,
    description: 'A modern dashboard application',
    tags: ['dashboard', 'react'],
  },
};

const meta = {
  component: ProjectCardPresentation,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    aspectRatio: {
      description: 'The aspect ratio of the card',
      control: { type: 'select' },
      options: ['aspect-[4/2.6]', 'aspect-[4/2.8]', 'aspect-square', 'aspect-video'],
    },
    searchQuery: {
      description: 'Search query to highlight in project name and description',
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
} satisfies Meta<typeof ProjectCardPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    project: mockProject,
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    aspectRatio: 'aspect-[4/2.6]',
    searchQuery: '',
    isTemplate: false,
  },
};

export const WithHighlight: Story = {
  args: {
    ...Default.args,
    searchQuery: 'dash',
    HighlightText: HighlightText,
  },
};

export const NoImage: Story = {
  args: {
    ...Default.args,
    imageUrl: null,
  },
};

export const AsTemplate: Story = {
  args: {
    ...Default.args,
    isTemplate: true,
  },
};

export const SquareAspect: Story = {
  args: {
    ...Default.args,
    aspectRatio: 'aspect-square',
  },
};

export const VideoAspect: Story = {
  args: {
    ...Default.args,
    aspectRatio: 'aspect-video',
  },
};

export const LongProjectName: Story = {
  args: {
    ...Default.args,
    project: {
      ...mockProject,
      name: 'This is a very long project name that should be truncated properly',
    },
  },
};

export const RecentlyUpdated: Story = {
  args: {
    ...Default.args,
    project: {
      ...mockProject,
      metadata: {
        ...mockProject.metadata,
        updatedAt: new Date(Date.now() - 1000 * 60 * 5),
      },
    },
  },
};
