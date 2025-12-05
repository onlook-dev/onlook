import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HotkeyLabel, type Hotkey } from '@onlook/ui/hotkey-label';

/**
 * HotkeyLabel displays a keyboard shortcut with its description.
 * It combines a text description with a styled keyboard key indicator.
 */
const meta = {
  title: 'UI/HotkeyLabel',
  component: HotkeyLabel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      description: 'Additional CSS classes for the container',
      control: 'text',
    },
  },
  args: {
    hotkey: {
      command: 'Escape',
      description: 'Cancel',
      readableCommand: '<kbd>Esc</kbd>',
    },
  },
} satisfies Meta<typeof HotkeyLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Simple single key shortcut
 */
export const Default: Story = {
  args: {
    hotkey: {
      command: 'Escape',
      description: 'Cancel',
      readableCommand: '<kbd>Esc</kbd>',
    },
  },
};

/**
 * Modifier key combination
 */
export const WithModifier: Story = {
  args: {
    hotkey: {
      command: 'Meta+S',
      description: 'Save',
      readableCommand: '<kbd>⌘</kbd><kbd>S</kbd>',
    },
  },
};

/**
 * Multiple modifier keys
 */
export const MultipleModifiers: Story = {
  args: {
    hotkey: {
      command: 'Meta+Shift+P',
      description: 'Command Palette',
      readableCommand: '<kbd>⌘</kbd><kbd>⇧</kbd><kbd>P</kbd>',
    },
  },
};

/**
 * Common editor shortcuts
 */
export const EditorShortcuts: Story = {
  render: () => {
    const shortcuts: Hotkey[] = [
      { command: 'Meta+Z', description: 'Undo', readableCommand: '<kbd>⌘</kbd><kbd>Z</kbd>' },
      { command: 'Meta+Shift+Z', description: 'Redo', readableCommand: '<kbd>⌘</kbd><kbd>⇧</kbd><kbd>Z</kbd>' },
      { command: 'Meta+C', description: 'Copy', readableCommand: '<kbd>⌘</kbd><kbd>C</kbd>' },
      { command: 'Meta+V', description: 'Paste', readableCommand: '<kbd>⌘</kbd><kbd>V</kbd>' },
      { command: 'Meta+X', description: 'Cut', readableCommand: '<kbd>⌘</kbd><kbd>X</kbd>' },
      { command: 'Delete', description: 'Delete', readableCommand: '<kbd>Del</kbd>' },
    ];

    return (
      <div className="flex flex-col gap-3">
        {shortcuts.map((hotkey) => (
          <HotkeyLabel key={hotkey.command} hotkey={hotkey} />
        ))}
      </div>
    );
  },
};

/**
 * Navigation shortcuts
 */
export const NavigationShortcuts: Story = {
  render: () => {
    const shortcuts: Hotkey[] = [
      { command: 'Meta+1', description: 'Design Mode', readableCommand: '<kbd>⌘</kbd><kbd>1</kbd>' },
      { command: 'Meta+2', description: 'Code Mode', readableCommand: '<kbd>⌘</kbd><kbd>2</kbd>' },
      { command: 'Meta+3', description: 'Preview Mode', readableCommand: '<kbd>⌘</kbd><kbd>3</kbd>' },
      { command: 'Space', description: 'Pan Canvas', readableCommand: '<kbd>Space</kbd>' },
      { command: 'Meta+Plus', description: 'Zoom In', readableCommand: '<kbd>⌘</kbd><kbd>+</kbd>' },
      { command: 'Meta+Minus', description: 'Zoom Out', readableCommand: '<kbd>⌘</kbd><kbd>-</kbd>' },
    ];

    return (
      <div className="flex flex-col gap-3">
        {shortcuts.map((hotkey) => (
          <HotkeyLabel key={hotkey.command} hotkey={hotkey} />
        ))}
      </div>
    );
  },
};

/**
 * Function key shortcuts
 */
export const FunctionKeys: Story = {
  render: () => {
    const shortcuts: Hotkey[] = [
      { command: 'F1', description: 'Help', readableCommand: '<kbd>F1</kbd>' },
      { command: 'F2', description: 'Rename', readableCommand: '<kbd>F2</kbd>' },
      { command: 'F5', description: 'Refresh', readableCommand: '<kbd>F5</kbd>' },
      { command: 'F11', description: 'Fullscreen', readableCommand: '<kbd>F11</kbd>' },
    ];

    return (
      <div className="flex flex-col gap-3">
        {shortcuts.map((hotkey) => (
          <HotkeyLabel key={hotkey.command} hotkey={hotkey} />
        ))}
      </div>
    );
  },
};

/**
 * Arrow key shortcuts
 */
export const ArrowKeys: Story = {
  render: () => {
    const shortcuts: Hotkey[] = [
      { command: 'ArrowUp', description: 'Move Up', readableCommand: '<kbd>↑</kbd>' },
      { command: 'ArrowDown', description: 'Move Down', readableCommand: '<kbd>↓</kbd>' },
      { command: 'ArrowLeft', description: 'Move Left', readableCommand: '<kbd>←</kbd>' },
      { command: 'ArrowRight', description: 'Move Right', readableCommand: '<kbd>→</kbd>' },
      { command: 'Shift+ArrowUp', description: 'Move Up 10px', readableCommand: '<kbd>⇧</kbd><kbd>↑</kbd>' },
    ];

    return (
      <div className="flex flex-col gap-3">
        {shortcuts.map((hotkey) => (
          <HotkeyLabel key={hotkey.command} hotkey={hotkey} />
        ))}
      </div>
    );
  },
};

/**
 * With custom styling
 */
export const CustomStyling: Story = {
  args: {
    hotkey: {
      command: 'Meta+K',
      description: 'Quick Actions',
      readableCommand: '<kbd>⌘</kbd><kbd>K</kbd>',
    },
    className: 'text-lg font-semibold',
  },
};

/**
 * In a menu context
 */
export const InMenuContext: Story = {
  render: () => {
    const menuItems: Hotkey[] = [
      { command: 'Meta+N', description: 'New Project', readableCommand: '<kbd>⌘</kbd><kbd>N</kbd>' },
      { command: 'Meta+O', description: 'Open Project', readableCommand: '<kbd>⌘</kbd><kbd>O</kbd>' },
      { command: 'Meta+S', description: 'Save', readableCommand: '<kbd>⌘</kbd><kbd>S</kbd>' },
      { command: 'Meta+Shift+S', description: 'Save As', readableCommand: '<kbd>⌘</kbd><kbd>⇧</kbd><kbd>S</kbd>' },
    ];

    return (
      <div className="w-64 rounded-lg border border-border bg-background p-2">
        {menuItems.map((hotkey, index) => (
          <div
            key={hotkey.command}
            className={`flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary cursor-pointer ${
              index < menuItems.length - 1 ? '' : ''
            }`}
          >
            <span className="text-sm">{hotkey.description}</span>
            <HotkeyLabel hotkey={{ ...hotkey, description: '' }} />
          </div>
        ))}
      </div>
    );
  },
};
