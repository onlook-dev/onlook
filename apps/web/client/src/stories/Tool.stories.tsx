import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@onlook/ui/ai-elements';
import { FileIcon, CodeIcon, SearchIcon } from 'lucide-react';

const meta = {
  component: Tool,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tool defaultOpen={true}>
      <ToolHeader
        type="tool-invocation"
        state="output-available"
        title="WriteFileTool"
      />
      <ToolContent>
        <ToolInput
          input={{
            path: '/src/components/Button.tsx',
            content: 'export const Button = () => <button>Click me</button>;',
          }}
        />
        <ToolOutput
          output={{ success: true, message: 'File written successfully' }}
          errorText={undefined}
        />
      </ToolContent>
    </Tool>
  ),
};

export const InputStreaming: Story = {
  render: () => (
    <Tool defaultOpen={true}>
      <ToolHeader
        type="tool-invocation"
        state="input-streaming"
        title="ReadFileTool"
        loading={true}
      />
      <ToolContent>
        <ToolInput
          input={{
            path: '/src/components/...',
          }}
          isStreaming={true}
        />
      </ToolContent>
    </Tool>
  ),
};

export const InputAvailable: Story = {
  render: () => (
    <Tool defaultOpen={true}>
      <ToolHeader
        type="tool-invocation"
        state="input-available"
        title="SearchTool"
        icon={<SearchIcon className="size-4 text-muted-foreground" />}
      />
      <ToolContent>
        <ToolInput
          input={{
            query: 'Button component',
            directory: '/src',
          }}
        />
      </ToolContent>
    </Tool>
  ),
};

export const OutputAvailable: Story = {
  render: () => (
    <Tool defaultOpen={true}>
      <ToolHeader
        type="tool-invocation"
        state="output-available"
        title="ReadFileTool"
        icon={<FileIcon className="size-4 text-muted-foreground" />}
      />
      <ToolContent>
        <ToolInput
          input={{
            path: '/src/components/Button.tsx',
          }}
        />
        <ToolOutput
          output={{
            content: 'export const Button = ({ children }) => <button>{children}</button>;',
            lines: 1,
          }}
          errorText={undefined}
        />
      </ToolContent>
    </Tool>
  ),
};

export const OutputError: Story = {
  render: () => (
    <Tool defaultOpen={true}>
      <ToolHeader
        type="tool-invocation"
        state="output-error"
        title="WriteFileTool"
        icon={<CodeIcon className="size-4 text-muted-foreground" />}
      />
      <ToolContent>
        <ToolInput
          input={{
            path: '/src/components/Button.tsx',
            content: 'invalid code {{{',
          }}
        />
        <ToolOutput
          output={undefined}
          errorText="SyntaxError: Unexpected token '{'"
        />
      </ToolContent>
    </Tool>
  ),
};

export const WithStatus: Story = {
  render: () => (
    <Tool defaultOpen={true}>
      <ToolHeader
        type="tool-invocation"
        state="output-available"
        title="WriteFileTool"
        showStatus={true}
      />
      <ToolContent>
        <ToolInput
          input={{
            path: '/src/index.ts',
            content: 'export * from "./components";',
          }}
        />
        <ToolOutput
          output={{ success: true }}
          errorText={undefined}
        />
      </ToolContent>
    </Tool>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <Tool defaultOpen={false}>
      <ToolHeader
        type="tool-invocation"
        state="output-available"
        title="WriteFileTool"
      />
      <ToolContent>
        <ToolInput
          input={{
            path: '/src/components/Button.tsx',
          }}
        />
        <ToolOutput
          output={{ success: true }}
          errorText={undefined}
        />
      </ToolContent>
    </Tool>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[600px]">
      <Tool defaultOpen={false}>
        <ToolHeader
          type="tool-invocation"
          state="input-streaming"
          title="Pending Tool"
          showStatus={true}
        />
      </Tool>
      <Tool defaultOpen={false}>
        <ToolHeader
          type="tool-invocation"
          state="input-available"
          title="Running Tool"
          showStatus={true}
        />
      </Tool>
      <Tool defaultOpen={false}>
        <ToolHeader
          type="tool-invocation"
          state="output-available"
          title="Completed Tool"
          showStatus={true}
        />
      </Tool>
      <Tool defaultOpen={false}>
        <ToolHeader
          type="tool-invocation"
          state="output-error"
          title="Failed Tool"
          showStatus={true}
        />
      </Tool>
    </div>
  ),
};
