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
    text: 'Landing Page Design',
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
    text: 'React Dashboard Template',
    searchQuery: 'DASHBOARD',
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
    text: 'My Amazing Project',
    searchQuery: 'ama',
  },
};

export const Examples: Story = {
  render: () => (
    <div className="flex flex-col gap-2 text-foreground">
      <div>
        <span className="text-muted-foreground mr-2">Query: "dash"</span>
        <HighlightText text="E-commerce Dashboard" searchQuery="dash" />
      </div>
      <div>
        <span className="text-muted-foreground mr-2">Query: "port"</span>
        <HighlightText text="Portfolio Website" searchQuery="port" />
      </div>
      <div>
        <span className="text-muted-foreground mr-2">Query: "react"</span>
        <HighlightText text="React Dashboard Template" searchQuery="react" />
      </div>
      <div>
        <span className="text-muted-foreground mr-2">Query: ""</span>
        <HighlightText text="No highlighting applied" searchQuery="" />
      </div>
    </div>
  ),
};
