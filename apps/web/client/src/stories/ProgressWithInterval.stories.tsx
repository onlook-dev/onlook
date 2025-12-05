import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ProgressWithInterval } from '@onlook/ui/progress-with-interval';

/**
 * ProgressWithInterval is an animated progress bar that automatically
 * increments over time when loading. It's useful for showing indeterminate
 * progress during async operations.
 */
const meta = {
  title: 'UI/ProgressWithInterval',
  component: ProgressWithInterval,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    isLoading: {
      description: 'Whether the progress should be actively running',
      control: 'boolean',
    },
    increment: {
      description: 'Progress increment per interval (default: 0.167)',
      control: { type: 'number', min: 0.01, max: 5, step: 0.01 },
    },
    intervalMs: {
      description: 'Interval duration in milliseconds (default: 100)',
      control: { type: 'number', min: 10, max: 1000, step: 10 },
    },
    maxValue: {
      description: 'Maximum progress value (default: 100)',
      control: { type: 'number', min: 1, max: 100 },
    },
    className: {
      description: 'Additional CSS classes',
      control: 'text',
    },
  },
  args: {
    isLoading: true,
  },
} satisfies Meta<typeof ProgressWithInterval>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default loading state
 */
export const Default: Story = {
  args: {
    isLoading: true,
  },
};

/**
 * Not loading (progress stays at 0)
 */
export const NotLoading: Story = {
  args: {
    isLoading: false,
  },
};

/**
 * Fast progress (higher increment)
 */
export const FastProgress: Story = {
  args: {
    isLoading: true,
    increment: 1,
    intervalMs: 100,
  },
};

/**
 * Slow progress (lower increment)
 */
export const SlowProgress: Story = {
  args: {
    isLoading: true,
    increment: 0.05,
    intervalMs: 100,
  },
};

/**
 * Custom interval timing
 */
export const CustomInterval: Story = {
  args: {
    isLoading: true,
    increment: 0.5,
    intervalMs: 200,
  },
};

/**
 * With custom max value
 */
export const CustomMaxValue: Story = {
  args: {
    isLoading: true,
    increment: 0.5,
    maxValue: 50,
  },
};

/**
 * Multiple progress bars with different speeds
 */
export const MultipleProgressBars: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Slow (0.05 increment)</p>
        <ProgressWithInterval isLoading increment={0.05} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">Default (0.167 increment)</p>
        <ProgressWithInterval isLoading />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">Fast (0.5 increment)</p>
        <ProgressWithInterval isLoading increment={0.5} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">Very Fast (1.0 increment)</p>
        <ProgressWithInterval isLoading increment={1.0} />
      </div>
    </div>
  ),
};

/**
 * In a loading card context
 */
export const InLoadingCard: Story = {
  render: () => (
    <div className="w-full rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-secondary rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Loading project...</p>
          <ProgressWithInterval isLoading increment={0.2} />
        </div>
      </div>
    </div>
  ),
};

/**
 * In a modal context
 */
export const InModalContext: Story = {
  render: () => (
    <div className="w-full rounded-lg border border-border bg-background p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-2">Deploying Project</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Please wait while we deploy your project to production...
      </p>
      <ProgressWithInterval isLoading increment={0.1} />
      <p className="text-xs text-muted-foreground mt-2">This may take a few minutes</p>
    </div>
  ),
};

/**
 * File upload simulation
 */
export const FileUploadSimulation: Story = {
  render: () => (
    <div className="w-full rounded-lg border border-dashed border-border bg-secondary/20 p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Uploading files...</p>
          <p className="text-xs text-muted-foreground">project-assets.zip</p>
        </div>
        <div className="w-full max-w-xs">
          <ProgressWithInterval isLoading increment={0.3} />
        </div>
      </div>
    </div>
  ),
};

/**
 * Build process simulation
 */
export const BuildProcessSimulation: Story = {
  render: () => (
    <div className="w-full rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-sm font-medium">Building project...</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Installing dependencies</span>
          <span className="text-green-500">Done</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Compiling TypeScript</span>
          <span className="text-green-500">Done</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Bundling assets</span>
          <span className="text-yellow-500">In progress...</span>
        </div>
        <ProgressWithInterval isLoading increment={0.15} />
      </div>
    </div>
  ),
};
