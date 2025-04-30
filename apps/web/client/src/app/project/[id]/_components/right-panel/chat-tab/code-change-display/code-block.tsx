import {
    getBasicSetup,
    getExtensions,
} from "@/app/project/[id]/_components/right-panel/dev-tab/code-mirror-config";
import { SystemTheme } from "@onlook/models";
import { cn } from "@onlook/ui/utils";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";

export const CodeBlock = ({
    className,
    code,
}: {
    className?: string;
    code: string;
    disableColor?: boolean;
}) => {
    const { theme } = useTheme();
    const languageExtension = getExtensions("javascript");
    const extensions = [
        ...getBasicSetup(() => {
            // No-op save function since this is a read-only display
        }),
        ...languageExtension,
    ];

    return (
        <CodeMirror
            value={code}
            readOnly={true}
            className={cn("flex w-full", className)}
            theme={theme === SystemTheme.DARK ? SystemTheme.DARK : SystemTheme.LIGHT}
            extensions={extensions}
        />
    );
};
