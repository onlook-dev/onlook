import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@onlook/ui/ai-elements';

const meta = {
  component: Reasoning,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isStreaming: {
      description: 'Whether the reasoning is currently streaming',
      control: 'boolean',
    },
    open: {
      description: 'Whether the reasoning content is expanded',
      control: 'boolean',
    },
    defaultOpen: {
      description: 'Whether the reasoning content is expanded by default',
      control: 'boolean',
    },
    duration: {
      description: 'Duration of the reasoning in seconds',
      control: 'number',
    },
  },
  args: {
    onOpenChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Reasoning>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleReasoningContent = `I need to analyze this code and understand what changes are needed.

First, let me look at the component structure and identify the key props and state management patterns being used.

The component uses React hooks for state management and has several callback props for handling user interactions.

Based on my analysis, I'll need to:
1. Update the prop types
2. Add new state for the feature
3. Implement the UI changes`;

export const Default: Story = {
  render: () => (
    <Reasoning defaultOpen={false} duration={5}>
      <ReasoningTrigger />
      <ReasoningContent>{sampleReasoningContent}</ReasoningContent>
    </Reasoning>
  ),
};

export const Expanded: Story = {
  render: () => (
    <Reasoning defaultOpen={true} duration={8}>
      <ReasoningTrigger />
      <ReasoningContent>{sampleReasoningContent}</ReasoningContent>
    </Reasoning>
  ),
};

export const Streaming: Story = {
  render: () => (
    <Reasoning isStreaming={true} defaultOpen={true}>
      <ReasoningTrigger />
      <ReasoningContent>
        {`I'm currently analyzing the codebase to understand the best approach...

Looking at the component structure...`}
      </ReasoningContent>
    </Reasoning>
  ),
};

export const ShortDuration: Story = {
  render: () => (
    <Reasoning defaultOpen={false} duration={2}>
      <ReasoningTrigger />
      <ReasoningContent>Quick analysis completed.</ReasoningContent>
    </Reasoning>
  ),
};

export const LongDuration: Story = {
  render: () => (
    <Reasoning defaultOpen={false} duration={45}>
      <ReasoningTrigger />
      <ReasoningContent>
        {`This was a complex analysis that required careful consideration of multiple factors.

I examined the entire codebase structure, identified dependencies, and mapped out the relationships between components.

After thorough analysis, I determined the optimal approach for implementing the requested changes.`}
      </ReasoningContent>
    </Reasoning>
  ),
};

export const NoDuration: Story = {
  render: () => (
    <Reasoning defaultOpen={false}>
      <ReasoningTrigger />
      <ReasoningContent>Reasoning without a specific duration.</ReasoningContent>
    </Reasoning>
  ),
};
