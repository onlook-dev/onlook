import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ButtonLink } from './button-link';
import { ArrowRight, ExternalLink, ChevronRight } from 'lucide-react';

/**
 * ButtonLink is a styled link component with an animated underline effect
 * and optional right icon that moves on hover.
 */
const meta = {
    component: ButtonLink,
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'dark',
        },
    },
    tags: ['autodocs'],
    argTypes: {
        href: {
            description: 'URL the link points to',
            control: 'text',
        },
        children: {
            description: 'Link text content',
            control: 'text',
        },
        target: {
            description: 'Target attribute for the link',
            control: { type: 'select' },
            options: ['_self', '_blank', '_parent', '_top'],
        },
        rel: {
            description: 'Rel attribute for the link',
            control: 'text',
        },
    },
} satisfies Meta<typeof ButtonLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default button link without icon
 */
export const Default: Story = {
    args: {
        href: '#',
        children: 'Learn more',
    },
};

/**
 * Button link with arrow icon
 */
export const WithArrowIcon: Story = {
    args: {
        href: '#',
        children: 'Get started',
        rightIcon: <ArrowRight className="w-4 h-4" />,
    },
};

/**
 * Button link with external link icon
 */
export const ExternalLinkStyle: Story = {
    args: {
        href: 'https://example.com',
        children: 'Visit website',
        rightIcon: <ExternalLink className="w-4 h-4" />,
        target: '_blank',
        rel: 'noopener noreferrer',
    },
};

/**
 * Button link with chevron icon
 */
export const WithChevron: Story = {
    args: {
        href: '#',
        children: 'View all projects',
        rightIcon: <ChevronRight className="w-4 h-4" />,
    },
};

/**
 * Button link opening in new tab
 */
export const NewTab: Story = {
    args: {
        href: 'https://docs.onlook.com',
        children: 'Documentation',
        rightIcon: <ExternalLink className="w-4 h-4" />,
        target: '_blank',
        rel: 'noopener noreferrer',
    },
};

/**
 * Button link with long text
 */
export const LongText: Story = {
    args: {
        href: '#',
        children: 'Read the complete documentation and getting started guide',
        rightIcon: <ArrowRight className="w-4 h-4" />,
    },
};

/**
 * Multiple button links
 */
export const MultipleLinks: Story = {
    args: {
        href: '#',
        children: 'Example link',
    },
    render: () => (
        <div className="flex flex-col gap-6">
            <ButtonLink href="#" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Get started
            </ButtonLink>
            <ButtonLink href="#" rightIcon={<ChevronRight className="w-4 h-4" />}>
                View documentation
            </ButtonLink>
            <ButtonLink
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                rightIcon={<ExternalLink className="w-4 h-4" />}
            >
                GitHub repository
            </ButtonLink>
            <ButtonLink href="#">
                Simple link without icon
            </ButtonLink>
        </div>
    ),
};
