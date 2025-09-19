import React from 'react';
import {
    Message,
    Conversation,
    CodeBlock,
    PromptInput,
    Loader,
    TypingIndicator,
    Artifact,
    Reasoning,
} from './index';

export function AIElementsExample() {
    const [messages, setMessages] = React.useState([
        {
            id: '1',
            role: 'assistant' as const,
            content: 'Hello! How can I help you today?',
            timestamp: new Date(),
        },
    ]);

    const handleSubmit = (value: string) => {
        const newMessage = {
            id: Date.now().toString(),
            role: 'user' as const,
            content: value,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMessage]);
    };

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            <h2 className="text-2xl font-bold">AI Elements Demo</h2>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Message Component</h3>
                <Message role="assistant" content="This is an assistant message" />
                <Message role="user" content="This is a user message" />
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Conversation Component</h3>
                <Conversation messages={messages} />
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Code Block Component</h3>
                <CodeBlock
                    language="typescript"
                    filename="example.ts"
                    code="const greeting = 'Hello, World!';\nconsole.log(greeting);"
                />
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Prompt Input Component</h3>
                <PromptInput placeholder="Type your message here..." onSubmit={handleSubmit} />
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Loading Components</h3>
                <div className="flex items-center gap-4">
                    <Loader />
                    <TypingIndicator />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Artifact Component</h3>
                <Artifact title="Sample Artifact" type="code">
                    <pre className="text-sm">
                        {`function example() {
  return "Hello from artifact!";
}`}
                    </pre>
                </Artifact>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Reasoning Component</h3>
                <Reasoning variant="thinking" title="Processing your request...">
                    <p>Analyzing the input and generating response...</p>
                </Reasoning>
            </div>
        </div>
    );
}
