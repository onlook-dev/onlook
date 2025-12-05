import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Checkbox } from '@onlook/ui/checkbox';
import { Label } from '@onlook/ui/label';

/**
 * Checkbox allows users to select one or more items from a set.
 */
const meta = {
    title: 'UI/Checkbox',
    component: Checkbox,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        checked: {
            description: 'Whether the checkbox is checked',
            control: 'boolean',
        },
        disabled: {
            description: 'Whether the checkbox is disabled',
            control: 'boolean',
        },
    },
    args: {
        onCheckedChange: fn(),
    },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default unchecked checkbox
 */
export const Default: Story = {
    args: {
        checked: false,
    },
};

/**
 * Checked checkbox
 */
export const Checked: Story = {
    args: {
        checked: true,
    },
};

/**
 * Disabled unchecked checkbox
 */
export const Disabled: Story = {
    args: {
        checked: false,
        disabled: true,
    },
};

/**
 * Disabled checked checkbox
 */
export const DisabledChecked: Story = {
    args: {
        checked: true,
        disabled: true,
    },
};

/**
 * Checkbox with label
 */
export const WithLabel: Story = {
    render: () => (
        <div className="flex items-center gap-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
    ),
};

/**
 * Checkbox list example
 */
export const CheckboxList: Story = {
    render: () => (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <Checkbox id="option-1" defaultChecked />
                <Label htmlFor="option-1">Email notifications</Label>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox id="option-2" defaultChecked />
                <Label htmlFor="option-2">Push notifications</Label>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox id="option-3" />
                <Label htmlFor="option-3">SMS notifications</Label>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox id="option-4" disabled />
                <Label htmlFor="option-4" className="text-muted-foreground">
                    Marketing emails (disabled)
                </Label>
            </div>
        </div>
    ),
};

/**
 * Invalid checkbox state
 */
export const Invalid: Story = {
    render: () => (
        <div className="flex items-center gap-2">
            <Checkbox id="required" aria-invalid />
            <Label htmlFor="required" className="text-destructive">
                This field is required
            </Label>
        </div>
    ),
};

/**
 * All checkbox states
 */
export const AllStates: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Checkbox />
                <span className="text-sm">Unchecked</span>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox defaultChecked />
                <span className="text-sm">Checked</span>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox disabled />
                <span className="text-sm text-muted-foreground">Disabled Unchecked</span>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox disabled defaultChecked />
                <span className="text-sm text-muted-foreground">Disabled Checked</span>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox aria-invalid />
                <span className="text-sm text-destructive">Invalid</span>
            </div>
        </div>
    ),
};
