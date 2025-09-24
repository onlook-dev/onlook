import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';
import CodeMirror from '@uiw/react-codemirror';

import { SystemTheme } from '@onlook/models';
import { cn } from '@onlook/ui/utils';

import { getExtensions } from '@/app/project/[id]/_components/right-panel/code-tab/code-mirror-config';

export const CodeBlock = ({
    className,
    code,
}: {
    className?: string;
    code: string;
    disableColor?: boolean;
}) => {
    const languageExtension = getExtensions('javascript');
    const extensions = [
        basicSetup({
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLineGutter: false,
        }),
        ...languageExtension,
    ];

    return (
        <div className="flex h-full w-full flex-col">
            <CodeMirror
                value={code}
                readOnly={true}
                className={cn(
                    'h-full max-h-full min-h-full w-full flex-1 overflow-auto',
                    className,
                )}
                theme={SystemTheme.DARK}
                extensions={extensions}
            />
        </div>
    );
};
