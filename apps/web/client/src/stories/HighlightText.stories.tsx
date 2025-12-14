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
      description: 'The search query to highlight',
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
    text: 'Portfolio Website',
    searchQuery: 'xyz',
  },
};

export const EmptyQuery: Story = {
  args: {
    text: 'Landing Page Template',
    searchQuery: '',
  },
};

export const CaseInsensitive: Story = {
  args: {
    text: 'React Dashboard Application',
    searchQuery: 'REACT',
  },
};

export const MultipleMatches: Story = {
  args: {
    text: 'Dashboard for Dashboard Analytics',
    searchQuery: 'Dashboard',
  },
};

export const PartialMatch: Story = {
  args: {
    text: 'Next.js E-commerce Store',
    searchQuery: 'com',
  },
};

export const FullMatch: Story = {
  args: {
    text: 'Blog',
    searchQuery: 'Blog',
  },
};

export const SpecialCharacters: Story = {
  args: {
    text: 'Project (v2.0) - Final',
    searchQuery: '(v2',
  },
};

export const InContext: Story = {
  args: {
    text: 'E-commerce Dashboard',
    searchQuery: 'dash',
  },
  render: () => (
    <div className="space-y-2 text-muted-foreground">
      <p>
        <HighlightText text="E-commerce Dashboard" searchQuery="dash" />
      </p>
      <p>
        <HighlightText text="Analytics Dashboard Pro" searchQuery="dash" />
      </p>
      <p>
        <HighlightText text="Portfolio Website" searchQuery="dash" />
      </p>
    </div>
  ),
};
