import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HighlightText } from '@/app/projects/_components/select/highlight-text';

/**
 * HighlightText is a utility component that highlights matching text
 * within a string based on a search query.
 */
const meta = {
  title: 'Projects/HighlightText',
  component: HighlightText,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    text: {
      description: 'The text to display and search within',
      control: 'text',
    },
    searchQuery: {
      description: 'The search query to highlight',
      control: 'text',
    },
  },
} satisfies Meta<typeof HighlightText>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state with matching text highlighted
 */
export const Default: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: 'dash',
  },
};

/**
 * No search query - displays text without highlighting
 */
export const NoSearchQuery: Story = {
  args: {
    text: 'Portfolio Website',
    searchQuery: '',
  },
};

/**
 * Search query at the beginning of text
 */
export const MatchAtStart: Story = {
  args: {
    text: 'Dashboard Analytics Platform',
    searchQuery: 'Dashboard',
  },
};

/**
 * Search query at the end of text
 */
export const MatchAtEnd: Story = {
  args: {
    text: 'Analytics Dashboard',
    searchQuery: 'Dashboard',
  },
};

/**
 * Multiple matches in the text
 */
export const MultipleMatches: Story = {
  args: {
    text: 'Dashboard for Dashboard Analytics',
    searchQuery: 'Dashboard',
  },
};

/**
 * Case-insensitive matching
 */
export const CaseInsensitive: Story = {
  args: {
    text: 'DASHBOARD Analytics dashboard',
    searchQuery: 'dashboard',
  },
};

/**
 * No match found - displays text without highlighting
 */
export const NoMatch: Story = {
  args: {
    text: 'Portfolio Website',
    searchQuery: 'dashboard',
  },
};

/**
 * Single character match
 */
export const SingleCharacter: Story = {
  args: {
    text: 'Analytics',
    searchQuery: 'a',
  },
};

/**
 * Special characters in search query (should be escaped)
 */
export const SpecialCharacters: Story = {
  args: {
    text: 'Project (v2.0) - Final',
    searchQuery: '(v2',
  },
};

/**
 * Long text with match
 */
export const LongText: Story = {
  args: {
    text: 'This is a very long project name that contains the word dashboard somewhere in the middle of the text',
    searchQuery: 'dashboard',
  },
};

/**
 * Various examples showing different highlight scenarios
 */
export const Examples: Story = {
  render: () => (
    <div className="flex flex-col gap-4 text-foreground">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-foreground-tertiary">Search: &quot;dash&quot;</span>
        <HighlightText text="E-commerce Dashboard" searchQuery="dash" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-foreground-tertiary">Search: &quot;port&quot;</span>
        <HighlightText text="Portfolio Website" searchQuery="port" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-foreground-tertiary">Search: &quot;react&quot;</span>
        <HighlightText text="React Dashboard Template" searchQuery="react" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-foreground-tertiary">No search query</span>
        <HighlightText text="Landing Page" searchQuery="" />
      </div>
    </div>
  ),
};
