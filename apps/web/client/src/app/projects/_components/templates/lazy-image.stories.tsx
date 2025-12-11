import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { LazyImage } from './lazy-image';

const meta = {
  component: LazyImage,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    src: {
      description: 'The source URL of the image',
      control: 'text',
    },
    alt: {
      description: 'Alt text for the image',
      control: 'text',
    },
    className: {
      description: 'Additional CSS classes for the container',
      control: 'text',
    },
    placeholderClassName: {
      description: 'CSS classes for the placeholder',
      control: 'text',
    },
    cardStyle: {
      description: 'Whether to apply card-style layout with margins and rounded corners',
      control: 'boolean',
    },
  },
  args: {
    onLoad: fn(),
    onError: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] h-[300px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LazyImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    alt: 'Dashboard preview',
    className: 'w-full h-full',
    cardStyle: false,
  },
};

export const CardStyle: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
    alt: 'Portfolio preview',
    className: 'w-full h-full',
    cardStyle: true,
  },
};

export const NoImage: Story = {
  args: {
    src: null,
    alt: 'No image available',
    className: 'w-full h-full',
    cardStyle: false,
  },
};

export const InvalidImage: Story = {
  args: {
    src: 'https://invalid-url-that-will-fail.com/image.jpg',
    alt: 'Failed to load',
    className: 'w-full h-full',
    cardStyle: false,
  },
};

export const WithCustomPlaceholder: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    alt: 'Analytics dashboard',
    className: 'w-full h-full',
    placeholderClassName: 'bg-blue-900/20',
    cardStyle: false,
  },
};

export const SmallSize: Story = {
  decorators: [
    (Story) => (
      <div className="w-[200px] h-[150px]">
        <Story />
      </div>
    ),
  ],
  args: {
    src: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=400&q=80',
    alt: 'Small preview',
    className: 'w-full h-full',
    cardStyle: false,
  },
};

export const LargeSize: Story = {
  decorators: [
    (Story) => (
      <div className="w-[600px] h-[400px]">
        <Story />
      </div>
    ),
  ],
  args: {
    src: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&q=80',
    alt: 'Large preview',
    className: 'w-full h-full',
    cardStyle: false,
  },
};

export const AllVariants: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    alt: 'Dashboard preview',
    className: 'w-full h-full',
    cardStyle: false,
  },
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="h-[200px]">
        <p className="text-sm text-foreground-secondary mb-2">Default</p>
        <LazyImage
          src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
          alt="Default"
          className="w-full h-full"
        />
      </div>
      <div className="h-[200px]">
        <p className="text-sm text-foreground-secondary mb-2">Card Style</p>
        <LazyImage
          src="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"
          alt="Card style"
          className="w-full h-full"
          cardStyle
        />
      </div>
      <div className="h-[200px]">
        <p className="text-sm text-foreground-secondary mb-2">No Image</p>
        <LazyImage
          src={null}
          alt="No image"
          className="w-full h-full"
        />
      </div>
      <div className="h-[200px]">
        <p className="text-sm text-foreground-secondary mb-2">Custom Placeholder</p>
        <LazyImage
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
          alt="Custom placeholder"
          className="w-full h-full"
          placeholderClassName="bg-purple-900/20"
        />
      </div>
    </div>
  ),
};
