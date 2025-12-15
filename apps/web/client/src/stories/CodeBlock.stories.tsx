import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import { CodeBlock, CodeBlockCopyButton } from '@onlook/ui/ai-elements';

const meta = {
  component: CodeBlock,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    code: {
      description: 'The code to display',
      control: 'text',
    },
    language: {
      description: 'The programming language for syntax highlighting',
      control: { type: 'select' },
      options: ['javascript', 'typescript', 'jsx', 'tsx', 'json', 'html', 'css', 'python', 'bash'],
    },
    showLineNumbers: {
      description: 'Whether to show line numbers',
      control: 'boolean',
    },
    isStreaming: {
      description: 'Whether the code is being streamed',
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleJavaScript = `function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return name;
}

greet('World');`;

const sampleTypeScript = `interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): User {
  return {
    id,
    name: 'John Doe',
    email: 'john@example.com',
  };
}`;

const sampleJSON = `{
  "name": "onlook",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0"
  }
}`;

const sampleJSX = `export function Button({ children, onClick }) {
  return (
    <button
      className="px-4 py-2 bg-primary text-white rounded-md"
      onClick={onClick}
    >
      {children}
    </button>
  );
}`;

export const Default: Story = {
  args: {
    code: sampleJavaScript,
    language: 'javascript',
    showLineNumbers: false,
    isStreaming: false,
  },
};

export const TypeScript: Story = {
  args: {
    code: sampleTypeScript,
    language: 'typescript',
    showLineNumbers: false,
  },
};

export const JSON: Story = {
  args: {
    code: sampleJSON,
    language: 'json',
    showLineNumbers: false,
  },
};

export const JSX: Story = {
  args: {
    code: sampleJSX,
    language: 'jsx',
    showLineNumbers: false,
  },
};

export const WithLineNumbers: Story = {
  args: {
    code: sampleTypeScript,
    language: 'typescript',
    showLineNumbers: true,
  },
};

export const Streaming: Story = {
  args: {
    code: sampleJavaScript,
    language: 'javascript',
    isStreaming: true,
  },
};

export const WithCopyButton: Story = {
  render: () => (
    <CodeBlock code={sampleJavaScript} language="javascript">
      <CodeBlockCopyButton onCopy={fn()} />
    </CodeBlock>
  ),
};

export const Languages: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[600px]">
      <div>
        <p className="text-sm text-muted-foreground mb-2">JavaScript</p>
        <CodeBlock code={sampleJavaScript} language="javascript" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">TypeScript</p>
        <CodeBlock code={sampleTypeScript} language="typescript" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">JSON</p>
        <CodeBlock code={sampleJSON} language="json" />
      </div>
    </div>
  ),
};

export const ShortCode: Story = {
  args: {
    code: 'const x = 42;',
    language: 'javascript',
  },
};
