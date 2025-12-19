import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HighlightText } from './highlight-text';

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
    text: 'E-commerce Dashboard Project',
    searchQuery: '',
  },
};

export const WithHighlight: Story = {
  args: {
    text: 'E-commerce Dashboard Project',
    searchQuery: 'Dashboard',
  },
};

export const CaseInsensitive: Story = {
  args: {
    text: 'E-commerce Dashboard Project',
    searchQuery: 'dashboard',
  },
};

export const MultipleMatches: Story = {
  args: {
    text: 'Dashboard Analytics Dashboard',
    searchQuery: 'Dashboard',
  },
};

export const PartialMatch: Story = {
  args: {
    text: 'E-commerce Dashboard Project',
    searchQuery: 'Dash',
  },
};

export const NoMatch: Story = {
  args: {
    text: 'E-commerce Dashboard Project',
    searchQuery: 'xyz',
  },
};

export const SpecialCharacters: Story = {
  args: {
    text: 'Project (v2.0) - Dashboard',
    searchQuery: '(v2.0)',
  },
};

export const LongText: Story = {
  args: {
    text: 'This is a very long project name that contains the word dashboard somewhere in the middle of the text',
    searchQuery: 'dashboard',
  },
};

export const EmptySearchQuery: Story = {
  args: {
    text: 'Portfolio Website',
    searchQuery: '',
  },
};

export const SingleCharacterMatch: Story = {
  args: {
    text: 'Analytics',
    searchQuery: 'a',
  },
};
