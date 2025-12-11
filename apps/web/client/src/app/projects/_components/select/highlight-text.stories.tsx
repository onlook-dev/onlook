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
  decorators: [
    (Story) => (
      <div className="text-foreground text-base">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HighlightText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: '',
  },
};

export const WithHighlight: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: 'dash',
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
    text: 'Dashboard Analytics Dashboard',
    searchQuery: 'Dashboard',
  },
};

export const NoMatch: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: 'xyz',
  },
};

export const PartialMatch: Story = {
  args: {
    text: 'Portfolio Website Design',
    searchQuery: 'port',
  },
};

export const SpecialCharacters: Story = {
  args: {
    text: 'Project (v2.0) - Final',
    searchQuery: '(v2',
  },
};

export const AllVariants: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: '',
  },
  render: () => (
    <div className="flex flex-col gap-4 text-foreground">
      <div>
        <span className="text-foreground-secondary text-sm">No highlight: </span>
        <HighlightText text="E-commerce Dashboard" searchQuery="" />
      </div>
      <div>
        <span className="text-foreground-secondary text-sm">With highlight: </span>
        <HighlightText text="E-commerce Dashboard" searchQuery="dash" />
      </div>
      <div>
        <span className="text-foreground-secondary text-sm">Case insensitive: </span>
        <HighlightText text="E-commerce Dashboard" searchQuery="COMMERCE" />
      </div>
      <div>
        <span className="text-foreground-secondary text-sm">Multiple matches: </span>
        <HighlightText text="Dashboard Analytics Dashboard" searchQuery="Dashboard" />
      </div>
    </div>
  ),
};
