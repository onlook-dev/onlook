import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Kbd } from '@onlook/ui/kbd';

/**
 * Kbd is a styled keyboard key indicator component used to display
 * keyboard shortcuts and key combinations in a visually distinct way.
 */
const meta = {
  title: 'UI/Kbd',
  component: Kbd,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      description: 'Additional CSS classes for styling',
      control: 'text',
    },
  },
  args: {
    children: 'K',
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Single key
 */
export const Default: Story = {
  args: {
    children: 'K',
  },
};

/**
 * Escape key
 */
export const Escape: Story = {
  args: {
    children: 'Esc',
  },
};

/**
 * Enter key
 */
export const Enter: Story = {
  args: {
    children: 'Enter',
  },
};

/**
 * Modifier keys
 */
export const ModifierKeys: Story = {
  render: () => (
    <div className="flex gap-2">
      <Kbd>⌘</Kbd>
      <Kbd>⇧</Kbd>
      <Kbd>⌥</Kbd>
      <Kbd>⌃</Kbd>
    </div>
  ),
};

/**
 * Arrow keys
 */
export const ArrowKeys: Story = {
  render: () => (
    <div className="flex gap-2">
      <Kbd>↑</Kbd>
      <Kbd>↓</Kbd>
      <Kbd>←</Kbd>
      <Kbd>→</Kbd>
    </div>
  ),
};

/**
 * Function keys
 */
export const FunctionKeys: Story = {
  render: () => (
    <div className="flex gap-2">
      <Kbd>F1</Kbd>
      <Kbd>F2</Kbd>
      <Kbd>F5</Kbd>
      <Kbd>F11</Kbd>
    </div>
  ),
};

/**
 * Key combination
 */
export const KeyCombination: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Kbd>⌘</Kbd>
      <span className="text-muted-foreground">+</span>
      <Kbd>S</Kbd>
    </div>
  ),
};

/**
 * Multiple key combination
 */
export const MultipleKeyCombination: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Kbd>⌘</Kbd>
      <span className="text-muted-foreground">+</span>
      <Kbd>⇧</Kbd>
      <span className="text-muted-foreground">+</span>
      <Kbd>P</Kbd>
    </div>
  ),
};

/**
 * Common shortcuts
 */
export const CommonShortcuts: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between w-48">
        <span className="text-sm">Save</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>S</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between w-48">
        <span className="text-sm">Copy</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>C</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between w-48">
        <span className="text-sm">Paste</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>V</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between w-48">
        <span className="text-sm">Undo</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>Z</Kbd>
        </div>
      </div>
    </div>
  ),
};

/**
 * Special keys
 */
export const SpecialKeys: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Kbd>Tab</Kbd>
      <Kbd>Space</Kbd>
      <Kbd>Del</Kbd>
      <Kbd>Backspace</Kbd>
      <Kbd>Home</Kbd>
      <Kbd>End</Kbd>
      <Kbd>PgUp</Kbd>
      <Kbd>PgDn</Kbd>
    </div>
  ),
};

/**
 * Letter keys
 */
export const LetterKeys: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </div>
  ),
};

/**
 * Number keys
 */
export const NumberKeys: Story = {
  render: () => (
    <div className="flex gap-2">
      {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </div>
  ),
};

/**
 * In tooltip context
 */
export const InTooltipContext: Story = {
  render: () => (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
      <div className="flex items-center gap-2">
        <span>Quick Actions</span>
        <div className="flex items-center gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
      </div>
    </div>
  ),
};

/**
 * In menu item context
 */
export const InMenuContext: Story = {
  render: () => (
    <div className="w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
      <div className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer">
        <span>New File</span>
        <div className="flex items-center gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>N</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer">
        <span>Open File</span>
        <div className="flex items-center gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>O</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer">
        <span>Save</span>
        <div className="flex items-center gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>S</Kbd>
        </div>
      </div>
      <div className="h-px bg-border my-1" />
      <div className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer">
        <span>Close</span>
        <div className="flex items-center gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>W</Kbd>
        </div>
      </div>
    </div>
  ),
};
