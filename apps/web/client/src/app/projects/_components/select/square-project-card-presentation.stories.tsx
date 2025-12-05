import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import type { Project } from '@onlook/models';
import { SquareProjectCardPresentation } from './square-project-card-presentation';
import { HighlightText } from './highlight-text';

/**
 * SquareProjectCardPresentation displays a project card with a square aspect ratio,
 * showing the project preview image, name, and last updated time.
 */
const meta = {
    component: SquareProjectCardPresentation,
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'dark',
        },
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="w-[300px]">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        imageUrl: {
            description: 'Pre-resolved URL of the preview image',
            control: 'text',
        },
        searchQuery: {
            description: 'Search query to highlight in project name',
            control: 'text',
        },
    },
    args: {
        onClick: fn(),
    },
} satisfies Meta<typeof SquareProjectCardPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

const createMockProject = (overrides?: Partial<Project>): Project => ({
    id: 'proj-123',
    name: 'E-commerce Dashboard',
    metadata: {
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        previewImg: null,
        description: 'Modern dashboard for managing online store',
        tags: ['react', 'next.js', 'tailwind'],
    },
    ...overrides,
});

/**
 * Default project card with image
 */
export const Default: Story = {
    args: {
        project: createMockProject(),
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
        searchQuery: '',
        HighlightText,
    },
};

/**
 * Project card without an image (shows gradient placeholder)
 */
export const NoImage: Story = {
    args: {
        project: createMockProject({
            name: 'New Blank Project',
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                previewImg: null,
                description: 'Fresh project ready for development',
                tags: [],
            },
        }),
        imageUrl: null,
        searchQuery: '',
        HighlightText,
    },
};

/**
 * Project card with search highlighting
 */
export const WithSearchHighlight: Story = {
    args: {
        project: createMockProject({
            name: 'Dashboard Analytics',
        }),
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
        searchQuery: 'dash',
        HighlightText,
    },
};

/**
 * Recently updated project
 */
export const RecentlyUpdated: Story = {
    args: {
        project: createMockProject({
            name: 'Portfolio Site',
            metadata: {
                createdAt: new Date('2024-10-01'),
                updatedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
                previewImg: null,
                description: 'Personal portfolio with Next.js',
                tags: ['portfolio'],
            },
        }),
        imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
        HighlightText,
    },
};

/**
 * Old project (updated long ago)
 */
export const OldProject: Story = {
    args: {
        project: createMockProject({
            name: 'Legacy Admin Panel',
            metadata: {
                createdAt: new Date('2023-01-15'),
                updatedAt: new Date('2023-06-20'),
                previewImg: null,
                description: 'Admin panel from last year',
                tags: ['legacy'],
            },
        }),
        imageUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
        HighlightText,
    },
};

/**
 * Project with long name that truncates
 */
export const LongName: Story = {
    args: {
        project: createMockProject({
            name: 'Super Long Project Name That Should Truncate When Displayed',
        }),
        imageUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
        HighlightText,
    },
};

/**
 * Project card without click handler (no edit button overlay)
 */
export const NoClickHandler: Story = {
    args: {
        project: createMockProject({
            name: 'View Only Project',
        }),
        imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
        onClick: undefined,
        HighlightText,
    },
};

/**
 * Multiple project cards in a grid
 */
export const ProjectGrid: Story = {
    args: {
        project: createMockProject(),
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
        HighlightText,
    },
    decorators: [
        (Story) => (
            <div className="w-[700px]">
                <Story />
            </div>
        ),
    ],
    render: () => (
        <div className="grid grid-cols-2 gap-4">
            <SquareProjectCardPresentation
                project={createMockProject({ name: 'E-commerce Dashboard' })}
                imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
                onClick={fn()}
                HighlightText={HighlightText}
            />
            <SquareProjectCardPresentation
                project={createMockProject({ name: 'Portfolio Website' })}
                imageUrl="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"
                onClick={fn()}
                HighlightText={HighlightText}
            />
            <SquareProjectCardPresentation
                project={createMockProject({ name: 'Landing Page' })}
                imageUrl={null}
                onClick={fn()}
                HighlightText={HighlightText}
            />
            <SquareProjectCardPresentation
                project={createMockProject({ name: 'Analytics Platform' })}
                imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
                onClick={fn()}
                HighlightText={HighlightText}
            />
        </div>
    ),
};
