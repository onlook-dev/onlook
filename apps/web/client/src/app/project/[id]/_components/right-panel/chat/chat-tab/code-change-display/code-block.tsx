import { cn } from "@onlook/ui/utils";
import { useTheme } from "@/app/_components/theme";
import { SystemTheme } from "@onlook/models";
import {
  getBasicSetup,
  getExtensions,
} from "@/app/project/[id]/_components/right-panel/dev/code-mirror-config";
import CodeMirror from "@uiw/react-codemirror";

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
