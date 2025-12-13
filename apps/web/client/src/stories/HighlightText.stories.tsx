import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HighlightText } from '@/app/projects/_components/select/highlight-text';

const meta = {
  component: HighlightText,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    text: {
      description: 'The text to display',
      control: 'text',
    },
    searchQuery: {
      description: 'The search query to highlight within the text',
      control: 'text',
    },
  },
} satisfies Meta<typeof HighlightText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: 'dash',
  },
};

export const NoMatch: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: 'xyz',
  },
};

export const EmptyQuery: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: '',
  },
};

export const FullMatch: Story = {
  args: {
    text: 'Dashboard',
    searchQuery: 'Dashboard',
  },
};

export const CaseInsensitive: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: 'DASH',
  },
};

export const MultipleMatches: Story = {
  args: {
    text: 'Dashboard for dashboard analytics',
    searchQuery: 'dashboard',
  },
};

export const PartialWord: Story = {
  args: {
    text: 'Portfolio Website Project',
    searchQuery: 'port',
  },
};

export const SpecialCharacters: Story = {
  args: {
    text: 'Project (v2.0) - Beta',
    searchQuery: '(v2',
  },
};

export const LongText: Story = {
  args: {
    text: 'This is a very long project name that contains the word dashboard somewhere in the middle of the text',
    searchQuery: 'dashboard',
  },
};
