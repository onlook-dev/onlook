import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { LazyImage } from './lazy-image';

/**
 * LazyImage is a component that lazily loads images with intersection observer,
 * showing a shimmer placeholder while loading and handling error states.
 */
const meta = {
    component: LazyImage,
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'dark',
        },
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="w-[400px] h-[300px]">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        src: {
            description: 'URL of the image to load',
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
            description: 'CSS classes for the placeholder element',
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
} satisfies Meta<typeof LazyImage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default lazy image with a valid source
 */
export const Default: Story = {
    args: {
        src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
        alt: 'Dashboard preview',
        className: 'w-full h-full',
    },
};

/**
 * Lazy image with card styling
 */
export const CardStyle: Story = {
    args: {
        src: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
        alt: 'Portfolio preview',
        cardStyle: true,
    },
};

/**
 * Lazy image with no source (shows placeholder)
 */
export const NoSource: Story = {
    args: {
        src: null,
        alt: 'No image available',
        className: 'w-full h-full',
    },
};

/**
 * Lazy image with invalid source (shows error state)
 */
export const ErrorState: Story = {
    args: {
        src: 'https://invalid-url-that-will-fail.com/image.jpg',
        alt: 'Failed to load',
        className: 'w-full h-full',
    },
};

/**
 * Lazy image with custom placeholder styling
 */
export const CustomPlaceholder: Story = {
    args: {
        src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
        alt: 'Analytics dashboard',
        className: 'w-full h-full',
        placeholderClassName: 'bg-blue-900/20',
    },
};

/**
 * Multiple lazy images in a grid
 */
export const ImageGrid: Story = {
    args: {
        src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
        alt: 'Grid example',
        className: 'w-full h-full',
    },
    decorators: [
        (Story) => (
            <div className="w-[800px]">
                <Story />
            </div>
        ),
    ],
    render: () => (
        <div className="grid grid-cols-3 gap-4">
            <div className="h-[200px]">
                <LazyImage
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80"
                    alt="Image 1"
                    className="w-full h-full"
                />
            </div>
            <div className="h-[200px]">
                <LazyImage
                    src="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&q=80"
                    alt="Image 2"
                    className="w-full h-full"
                />
            </div>
            <div className="h-[200px]">
                <LazyImage
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80"
                    alt="Image 3"
                    className="w-full h-full"
                />
            </div>
            <div className="h-[200px]">
                <LazyImage
                    src={null}
                    alt="No image"
                    className="w-full h-full"
                />
            </div>
            <div className="h-[200px]">
                <LazyImage
                    src="https://images.unsplash.com/photo-1547658719-da2b51169166?w=400&q=80"
                    alt="Image 5"
                    className="w-full h-full"
                />
            </div>
            <div className="h-[200px]">
                <LazyImage
                    src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&q=80"
                    alt="Image 6"
                    className="w-full h-full"
                />
            </div>
        </div>
    ),
};
