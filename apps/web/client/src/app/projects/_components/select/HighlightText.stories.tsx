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
    text: 'Dashboard Project',
    searchQuery: '',
  },
};

export const WithHighlight: Story = {
  args: {
    ...Default.args,
    text: 'Dashboard Project',
    searchQuery: 'dash',
  },
};

export const CaseInsensitive: Story = {
  args: {
    ...Default.args,
    text: 'Dashboard Project',
    searchQuery: 'DASH',
  },
};

export const MultipleMatches: Story = {
  args: {
    ...Default.args,
    text: 'Dashboard with dashboard features',
    searchQuery: 'dashboard',
  },
};

export const NoMatch: Story = {
  args: {
    ...Default.args,
    text: 'Dashboard Project',
    searchQuery: 'xyz',
  },
};

export const PartialMatch: Story = {
  args: {
    ...Default.args,
    text: 'My Amazing Project Name',
    searchQuery: 'proj',
  },
};
