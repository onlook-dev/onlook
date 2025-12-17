import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { TopBarPresentation } from '@/app/projects/_components/top-bar-presentation';
import type { User } from '@onlook/models';

const meta = {
  component: TopBarPresentation,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    searchQuery: {
      description: 'Current search query',
      control: 'text',
    },
    isCreatingProject: {
      description: 'Whether a project is being created',
      control: 'boolean',
    },
    recentSearches: {
      description: 'Array of recent search queries',
      control: 'object',
    },
  },
  args: {
    onSearchChange: fn(),
    onCreateBlank: fn(),
    onImport: fn(),
  },
} satisfies Meta<typeof TopBarPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock user data
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


/**
 * Default top bar with logged-in user
 */
export const Default: Story = {
  args: {
    user: mockUser,
    searchQuery: '',
    recentSearches: [],
    isCreatingProject: false,
    homeRoute: '/',
  },
};

export const WithSearch: Story = {
  args: {
    user: mockUser,
    searchQuery: 'dashboard',
    recentSearches: ['dashboard', 'landing', 'admin', 'portfolio'],
    isCreatingProject: false,
  },
};

export const CreatingProject: Story = {
  args: {
    user: mockUser,
    searchQuery: '',
    recentSearches: [],
    isCreatingProject: true,
  },
};

export const LoggedOut: Story = {
  args: {
    user: null,
    searchQuery: '',
    recentSearches: [],
    isCreatingProject: false,
  },
};

export const MinimalUser: Story = {
  args: {
    user: {
      id: 'user-456',
      firstName: null,
      lastName: null,
      displayName: null,
      email: 'minimal@example.com',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: null,
      githubInstallationId: null,
    },
    searchQuery: '',
    recentSearches: [],
    isCreatingProject: false,
  },
};

export const WithManyRecentSearches: Story = {
  args: {
    user: mockUser,
    searchQuery: 'd',
    recentSearches: [
      'dashboard',
      'design system',
      'docs',
      'data visualization',
      'development',
      'deployment',
    ],
    isCreatingProject: false,
  },
};

export const LongSearchQuery: Story = {
  args: {
    user: mockUser,
    searchQuery: 'this is a very long search query that users might type',
    recentSearches: [],
    isCreatingProject: false,
  },
};

export const NoSearch: Story = {
  args: {
    user: mockUser,
    searchQuery: undefined,
    onSearchChange: undefined,
    recentSearches: [],
    isCreatingProject: false,
  },
};

export const WithAvatar: Story = {
  args: {
    user: {
      ...mockUser,
      displayName: 'John Smith',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
    },
    searchQuery: '',
    recentSearches: [],
    isCreatingProject: false,
  },
};

export const Playground: Story = {
  args: {
    user: mockUser,
    searchQuery: '',
    recentSearches: ['dashboard', 'admin', 'landing'],
    isCreatingProject: false,
    homeRoute: '/',
  },
};
