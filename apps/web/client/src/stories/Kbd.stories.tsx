import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Kbd } from '@onlook/ui/kbd';

const meta = {
  component: Kbd,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: 'The keyboard key or shortcut to display',
      control: 'text',
    },
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'K',
  },
};

export const Enter: Story = {
  args: {
    children: 'Enter',
  },
};

export const Escape: Story = {
  args: {
    children: 'Esc',
  },
};

export const CommandK: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </div>
  ),
};

export const CtrlShiftP: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Kbd>Ctrl</Kbd>
      <Kbd>Shift</Kbd>
      <Kbd>P</Kbd>
    </div>
  ),
};

export const CommonShortcuts: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between w-[200px]">
        <span className="text-sm text-muted-foreground">Save</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>S</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between w-[200px]">
        <span className="text-sm text-muted-foreground">Copy</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>C</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between w-[200px]">
        <span className="text-sm text-muted-foreground">Paste</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>V</Kbd>
        </div>
      </div>
      <div className="flex items-center justify-between w-[200px]">
        <span className="text-sm text-muted-foreground">Undo</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>Z</Kbd>
        </div>
      </div>
    </div>
  ),
};

export const ArrowKeys: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-1">
      <Kbd>↑</Kbd>
      <div className="flex gap-1">
        <Kbd>←</Kbd>
        <Kbd>↓</Kbd>
        <Kbd>→</Kbd>
      </div>
    </div>
  ),
};
