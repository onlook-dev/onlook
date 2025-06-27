import { getExtensions } from '@/app/project/[id]/_components/right-panel/dev-tab/code-mirror-config';
import { SystemTheme } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';
import CodeMirror from '@uiw/react-codemirror';

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
        <div className="flex flex-col w-full h-full">
            <CodeMirror
                value={code}
                readOnly={true}
                className={cn(
                    'flex-1 w-full h-full min-h-full max-h-full overflow-auto',
                    className,
                )}
                theme={SystemTheme.DARK}
                extensions={extensions}
            />
        </div>
    );
};
