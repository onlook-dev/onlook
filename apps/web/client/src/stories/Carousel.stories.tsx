import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Carousel } from '@/app/projects/_components/carousel';

/**
 * Carousel is a horizontal scrollable container with navigation buttons
 * that appear when content overflows. It includes smooth scrolling and
 * gradient fade effects at the edges.
 */
const meta = {
  title: 'Projects/Carousel',
  component: Carousel,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    gap: {
      description: 'Gap between items (Tailwind class)',
      control: 'text',
    },
    className: {
      description: 'Additional CSS classes',
      control: 'text',
    },
    scrollAmount: {
      description: 'Amount to scroll when clicking navigation buttons (in pixels)',
      control: 'number',
    },
    tolerance: {
      description: 'Tolerance for detecting scroll position (in pixels)',
      control: 'number',
    },
  },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleCard = ({ title, color }: { title: string; color: string }) => (
  <div
    className={`flex-shrink-0 w-48 h-32 rounded-lg flex items-center justify-center text-white font-medium ${color}`}
  >
    {title}
  </div>
);

/**
 * Default carousel with multiple items that overflow
 */
export const Default: Story = {
  args: {
    gap: 'gap-4',
    scrollAmount: 300,
    tolerance: 10,
    children: (
      <>
        <SampleCard title="Card 1" color="bg-blue-600" />
        <SampleCard title="Card 2" color="bg-green-600" />
        <SampleCard title="Card 3" color="bg-purple-600" />
        <SampleCard title="Card 4" color="bg-orange-600" />
        <SampleCard title="Card 5" color="bg-pink-600" />
        <SampleCard title="Card 6" color="bg-teal-600" />
        <SampleCard title="Card 7" color="bg-red-600" />
      </>
    ),
  },
};

/**
 * Carousel with fewer items that don't overflow (no navigation buttons)
 */
export const NoOverflow: Story = {
  args: {
    gap: 'gap-4',
    children: (
      <>
        <SampleCard title="Card 1" color="bg-blue-600" />
        <SampleCard title="Card 2" color="bg-green-600" />
      </>
    ),
  },
};

/**
 * Carousel with larger gap between items
 */
export const LargeGap: Story = {
  args: {
    gap: 'gap-8',
    children: (
      <>
        <SampleCard title="Card 1" color="bg-blue-600" />
        <SampleCard title="Card 2" color="bg-green-600" />
        <SampleCard title="Card 3" color="bg-purple-600" />
        <SampleCard title="Card 4" color="bg-orange-600" />
        <SampleCard title="Card 5" color="bg-pink-600" />
      </>
    ),
  },
};

/**
 * Carousel with smaller gap between items
 */
export const SmallGap: Story = {
  args: {
    gap: 'gap-2',
    children: (
      <>
        <SampleCard title="Card 1" color="bg-blue-600" />
        <SampleCard title="Card 2" color="bg-green-600" />
        <SampleCard title="Card 3" color="bg-purple-600" />
        <SampleCard title="Card 4" color="bg-orange-600" />
        <SampleCard title="Card 5" color="bg-pink-600" />
        <SampleCard title="Card 6" color="bg-teal-600" />
      </>
    ),
  },
};

/**
 * Carousel with custom scroll amount
 */
export const CustomScrollAmount: Story = {
  args: {
    gap: 'gap-4',
    scrollAmount: 500,
    children: (
      <>
        <SampleCard title="Card 1" color="bg-blue-600" />
        <SampleCard title="Card 2" color="bg-green-600" />
        <SampleCard title="Card 3" color="bg-purple-600" />
        <SampleCard title="Card 4" color="bg-orange-600" />
        <SampleCard title="Card 5" color="bg-pink-600" />
        <SampleCard title="Card 6" color="bg-teal-600" />
        <SampleCard title="Card 7" color="bg-red-600" />
        <SampleCard title="Card 8" color="bg-yellow-600" />
      </>
    ),
  },
};

const CARD_COLORS = [
  'bg-blue-600',
  'bg-green-600',
  'bg-purple-600',
  'bg-orange-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-red-600',
  'bg-yellow-600',
  'bg-indigo-600',
  'bg-cyan-600',
] as const;

/**
 * Carousel with many items
 */
export const ManyItems: Story = {
  args: {
    gap: 'gap-4',
    children: (
      <>
        {Array.from({ length: 15 }, (_, i) => (
          <SampleCard
            key={i}
            title={`Card ${i + 1}`}
            color={CARD_COLORS[i % CARD_COLORS.length] ?? 'bg-blue-600'}
          />
        ))}
      </>
    ),
  },
};

/**
 * Carousel with varying card sizes
 */
export const VaryingSizes: Story = {
  args: {
    gap: 'gap-4',
    children: (
      <>
        <div className="flex-shrink-0 w-32 h-32 rounded-lg flex items-center justify-center text-white font-medium bg-blue-600">
          Small
        </div>
        <div className="flex-shrink-0 w-64 h-32 rounded-lg flex items-center justify-center text-white font-medium bg-green-600">
          Wide
        </div>
        <div className="flex-shrink-0 w-48 h-32 rounded-lg flex items-center justify-center text-white font-medium bg-purple-600">
          Medium
        </div>
        <div className="flex-shrink-0 w-56 h-32 rounded-lg flex items-center justify-center text-white font-medium bg-orange-600">
          Large
        </div>
        <div className="flex-shrink-0 w-40 h-32 rounded-lg flex items-center justify-center text-white font-medium bg-pink-600">
          Normal
        </div>
      </>
    ),
  },
};

/**
 * Carousel in a narrow container
 */
export const NarrowContainer: Story = {
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
  args: {
    gap: 'gap-4',
    children: (
      <>
        <SampleCard title="Card 1" color="bg-blue-600" />
        <SampleCard title="Card 2" color="bg-green-600" />
        <SampleCard title="Card 3" color="bg-purple-600" />
        <SampleCard title="Card 4" color="bg-orange-600" />
      </>
    ),
  },
};

/**
 * Carousel in a wide container
 */
export const WideContainer: Story = {
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
  args: {
    gap: 'gap-4',
    children: (
      <>
        <SampleCard title="Card 1" color="bg-blue-600" />
        <SampleCard title="Card 2" color="bg-green-600" />
        <SampleCard title="Card 3" color="bg-purple-600" />
        <SampleCard title="Card 4" color="bg-orange-600" />
        <SampleCard title="Card 5" color="bg-pink-600" />
        <SampleCard title="Card 6" color="bg-teal-600" />
        <SampleCard title="Card 7" color="bg-red-600" />
        <SampleCard title="Card 8" color="bg-yellow-600" />
      </>
    ),
  },
};
