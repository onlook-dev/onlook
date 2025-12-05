import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { Switch } from '@onlook/ui/switch';
import { Label } from '@onlook/ui/label';

/**
 * Switch is a toggle control for binary on/off states.
 */
const meta = {
    title: 'UI/Switch',
    component: Switch,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        checked: {
            description: 'Whether the switch is checked',
            control: 'boolean',
        },
        disabled: {
            description: 'Whether the switch is disabled',
            control: 'boolean',
        },
    },
    args: {
        onCheckedChange: fn(),
    },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default unchecked switch
 */
export const Default: Story = {
    args: {
        checked: false,
    },
};

/**
 * Checked switch
 */
export const Checked: Story = {
    args: {
        checked: true,
    },
};

/**
 * Disabled unchecked switch
 */
export const Disabled: Story = {
    args: {
        checked: false,
        disabled: true,
    },
};

/**
 * Disabled checked switch
 */
export const DisabledChecked: Story = {
    args: {
        checked: true,
        disabled: true,
    },
};

/**
 * Switch with label
 */
export const WithLabel: Story = {
    render: () => (
        <div className="flex items-center gap-2">
            <Switch id="airplane-mode" />
            <Label htmlFor="airplane-mode">Airplane Mode</Label>
        </div>
    ),
};

/**
 * Switch in a settings context
 */
export const SettingsExample: Story = {
    render: () => (
        <div className="flex flex-col gap-4 w-[300px]">
            <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Notifications</Label>
                <Switch id="notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <Switch id="dark-mode" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="auto-save">Auto Save</Label>
                <Switch id="auto-save" />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="disabled-setting" className="text-muted-foreground">
                    Disabled Setting
                </Label>
                <Switch id="disabled-setting" disabled />
            </div>
        </div>
    ),
};

/**
 * All switch states
 */
export const AllStates: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Switch />
                <span className="text-sm">Unchecked</span>
            </div>
            <div className="flex items-center gap-2">
                <Switch defaultChecked />
                <span className="text-sm">Checked</span>
            </div>
            <div className="flex items-center gap-2">
                <Switch disabled />
                <span className="text-sm text-muted-foreground">Disabled Unchecked</span>
            </div>
            <div className="flex items-center gap-2">
                <Switch disabled defaultChecked />
                <span className="text-sm text-muted-foreground">Disabled Checked</span>
            </div>
        </div>
    ),
};
