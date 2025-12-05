import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HighlightText } from './highlight-text';

/**
 * HighlightText is a utility component that highlights matching text
 * within a string based on a search query.
 */
const meta = {
    component: HighlightText,
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'dark',
        },
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="text-foreground-secondary text-sm">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        text: {
            description: 'The text to display and search within',
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

/**
 * Default highlight with matching text
 */
export const Default: Story = {
    args: {
        text: 'E-commerce Dashboard',
        searchQuery: 'dash',
    },
};

/**
 * No search query (shows plain text)
 */
export const NoSearchQuery: Story = {
    args: {
        text: 'Portfolio Website',
        searchQuery: '',
    },
};

/**
 * Case insensitive matching
 */
export const CaseInsensitive: Story = {
    args: {
        text: 'Dashboard Analytics',
        searchQuery: 'DASH',
    },
};

/**
 * Multiple matches in text
 */
export const MultipleMatches: Story = {
    args: {
        text: 'Dashboard for Dashboard Management',
        searchQuery: 'Dashboard',
    },
};

/**
 * No match found (shows plain text)
 */
export const NoMatch: Story = {
    args: {
        text: 'E-commerce Platform',
        searchQuery: 'xyz',
    },
};

/**
 * Match at the beginning
 */
export const MatchAtBeginning: Story = {
    args: {
        text: 'React Application',
        searchQuery: 'React',
    },
};

/**
 * Match at the end
 */
export const MatchAtEnd: Story = {
    args: {
        text: 'Next.js Dashboard',
        searchQuery: 'Dashboard',
    },
};

/**
 * Partial word match
 */
export const PartialMatch: Story = {
    args: {
        text: 'Landing Page Design',
        searchQuery: 'and',
    },
};

/**
 * Special characters in search query (escaped properly)
 */
export const SpecialCharacters: Story = {
    args: {
        text: 'Project (v2.0) - Final',
        searchQuery: '(v2',
    },
};

/**
 * Long text with highlight
 */
export const LongText: Story = {
    decorators: [
        (Story) => (
            <div className="max-w-md text-foreground-secondary text-sm">
                <Story />
            </div>
        ),
    ],
    args: {
        text: 'This is a very long project description that contains the word dashboard somewhere in the middle and should highlight it properly.',
        searchQuery: 'dashboard',
    },
};

/**
 * Multiple highlight examples
 */
export const MultipleExamples: Story = {
    args: {
        text: 'Example text',
        searchQuery: 'example',
    },
    render: () => (
        <div className="flex flex-col gap-4 text-foreground-secondary text-sm">
            <div>
                <span className="text-foreground-tertiary text-xs block mb-1">Search: &quot;dash&quot;</span>
                <HighlightText text="E-commerce Dashboard" searchQuery="dash" />
            </div>
            <div>
                <span className="text-foreground-tertiary text-xs block mb-1">Search: &quot;port&quot;</span>
                <HighlightText text="Portfolio Website" searchQuery="port" />
            </div>
            <div>
                <span className="text-foreground-tertiary text-xs block mb-1">Search: &quot;next&quot;</span>
                <HighlightText text="Next.js Starter Template" searchQuery="next" />
            </div>
            <div>
                <span className="text-foreground-tertiary text-xs block mb-1">No search query</span>
                <HighlightText text="Admin Panel" searchQuery="" />
            </div>
        </div>
    ),
};
