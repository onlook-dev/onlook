import type { Meta, StoryObj } from '@storybook/react';
import { TopBarPresentation } from '@/app/projects/_components/top-bar-presentation';
import type { User } from '@onlook/models';
import { fn } from '@storybook/test';

/**
 * TopBar displays the main navigation bar with logo, search, create dropdown, and user avatar.
 */
const meta = {
  title: 'Projects/TopBar',
  component: TopBarPresentation,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    user: {
      description: 'Current user data',
    },
    searchQuery: {
      control: 'text',
      description: 'Current search query',
    },
    isCreatingProject: {
      control: 'boolean',
      description: 'Whether a project is being created',
    },
    recentSearches: {
      control: 'object',
      description: 'Array of recent search queries',
    },
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

// Action callbacks
const onCreateBlank = fn();
const onImport = fn();
const onSearchChange = fn();

/**
 * Default top bar with logged-in user
 */
export const Default: Story = {
  args: {
    user: mockUser,
    searchQuery: '',
    onSearchChange,
    recentSearches: [],
    isCreatingProject: false,
    onCreateBlank,
    onImport,
    homeRoute: '/',
  },
};

/**
 * Top bar with active search query
 */
export const WithSearch: Story = {
  args: {
    user: mockUser,
    searchQuery: 'dashboard',
    onSearchChange,
    recentSearches: ['dashboard', 'landing', 'admin', 'portfolio'],
    isCreatingProject: false,
    onCreateBlank,
    onImport,
  },
};

/**
 * Top bar while creating a project
 */
export const CreatingProject: Story = {
  args: {
    user: mockUser,
    searchQuery: '',
    onSearchChange,
    recentSearches: [],
    isCreatingProject: true,
    onCreateBlank,
    onImport,
  },
};

/**
 * Top bar for logged-out user
 */
export const LoggedOut: Story = {
  args: {
    user: null,
    searchQuery: '',
    onSearchChange,
    recentSearches: [],
    isCreatingProject: false,
    onCreateBlank,
    onImport,
  },
};

/**
 * Top bar with minimal user data
 */
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
    onSearchChange,
    recentSearches: [],
    isCreatingProject: false,
    onCreateBlank,
    onImport,
  },
};

/**
 * Top bar with many recent searches
 */
export const WithManyRecentSearches: Story = {
  args: {
    user: mockUser,
    searchQuery: 'd',
    onSearchChange,
    recentSearches: [
      'dashboard',
      'design system',
      'docs',
      'data visualization',
      'development',
      'deployment',
    ],
    isCreatingProject: false,
    onCreateBlank,
    onImport,
  },
};

/**
 * Top bar with long search query
 */
export const LongSearchQuery: Story = {
  args: {
    user: mockUser,
    searchQuery: 'this is a very long search query that users might type',
    onSearchChange,
    recentSearches: [],
    isCreatingProject: false,
    onCreateBlank,
    onImport,
  },
};

/**
 * Top bar without search functionality
 */
export const NoSearch: Story = {
  args: {
    user: mockUser,
    searchQuery: undefined,
    onSearchChange: undefined,
    recentSearches: [],
    isCreatingProject: false,
    onCreateBlank,
    onImport,
  },
};

/**
 * Top bar with user with avatar
 */
export const WithAvatar: Story = {
  args: {
    user: {
      ...mockUser,
      displayName: 'John Smith',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
    },
    searchQuery: '',
    onSearchChange,
    recentSearches: [],
    isCreatingProject: false,
    onCreateBlank,
    onImport,
  },
};

/**
 * Interactive playground to test all states
 */
export const Playground: Story = {
  args: {
    user: mockUser,
    searchQuery: '',
    onSearchChange,
    recentSearches: ['dashboard', 'admin', 'landing'],
    isCreatingProject: false,
    onCreateBlank,
    onImport,
    homeRoute: '/',
  },
};
