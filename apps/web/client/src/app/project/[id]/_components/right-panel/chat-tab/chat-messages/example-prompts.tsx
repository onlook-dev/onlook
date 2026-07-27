'use client';

import { useEditorEngine } from '@/components/store/editor';
import { ChatType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

interface ExamplePrompt {
    icon: keyof typeof Icons;
    text: string;
    prompt: string;
}

const EXAMPLE_PROMPTS: Record<ChatType, ExamplePrompt[]> = {
    [ChatType.CREATE]: [
        {
            icon: 'MagicWand',
            text: 'Add a hero section',
            prompt: 'Create a modern hero section with a heading, subheading, and CTA button',
        },
        {
            icon: 'Component',
            text: 'Build a contact form',
            prompt: 'Add a contact form with name, email, message fields and a submit button',
        },
        {
            icon: 'Frame',
            text: 'Create a navbar',
            prompt: 'Build a responsive navigation bar with logo and menu items',
        },
    ],
    [ChatType.EDIT]: [
        {
            icon: 'Pencil',
            text: 'Change the button color',
            prompt: 'Make the selected button blue with white text',
        },
        {
            icon: 'Size',
            text: 'Adjust spacing',
            prompt: 'Increase the padding around the selected element',
        },
        {
            icon: 'Text',
            text: 'Update text content',
            prompt: 'Change the heading text to say "Welcome to Our Platform"',
        },
    ],
    [ChatType.ASK]: [
        {
            icon: 'QuestionMarkCircled',
            text: 'Explain this component',
            prompt: 'What does this component do and how does it work?',
        },
        {
            icon: 'Code',
            text: 'Show me the structure',
            prompt: 'Explain the component hierarchy and data flow',
        },
        {
            icon: 'InfoCircled',
            text: 'Suggest improvements',
            prompt: 'What improvements can I make to this component?',
        },
    ],
    [ChatType.FIX]: [
        {
            icon: 'ExclamationTriangle',
            text: 'Fix layout issues',
            prompt: 'Fix any layout or alignment problems in the selected element',
        },
        {
            icon: 'CrossCircled',
            text: 'Debug errors',
            prompt: 'Find and fix any errors or warnings in the code',
        },
        {
            icon: 'Reset',
            text: 'Optimize performance',
            prompt: 'Improve the performance and remove any unnecessary code',
        },
    ],
};

interface ExamplePromptsProps {
    onSelectPrompt: (prompt: string, type: ChatType) => void;
}

export const ExamplePrompts = observer(({ onSelectPrompt }: ExamplePromptsProps) => {
    const editorEngine = useEditorEngine();
    const chatMode = editorEngine.state.chatMode;
    const prompts = EXAMPLE_PROMPTS[chatMode] || EXAMPLE_PROMPTS[ChatType.EDIT];

    const getModeTitle = () => {
        switch (chatMode) {
            case ChatType.CREATE:
                return 'Create something new';
            case ChatType.EDIT:
                return 'Edit your design';
            case ChatType.ASK:
                return 'Ask about your code';
            case ChatType.FIX:
                return 'Fix issues';
            default:
                return 'Try an example';
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center text-foreground-tertiary/80 h-full px-6">
            <Icons.EmptyState className="size-24 mb-4" />
            <h3 className="text-lg font-medium text-foreground-secondary mb-2">
                {getModeTitle()}
            </h3>
            <p className="text-sm text-foreground-tertiary/80 mb-6 text-center max-w-[300px]">
                Start a conversation or try one of these examples
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[320px]">
                {prompts.map((example, index) => {
                    const IconComponent = Icons[example.icon];
                    return (
                        <Button
                            key={index}
                            variant="outline"
                            className="justify-start gap-3 h-auto py-3 px-4 text-left hover:bg-background-secondary/50 hover:border-foreground-secondary/30 transition-all"
                            onClick={() => onSelectPrompt(example.prompt, chatMode)}
                        >
                            <IconComponent className="h-4 w-4 flex-shrink-0 text-foreground-secondary" />
                            <span className="text-sm text-foreground-secondary">{example.text}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
});
