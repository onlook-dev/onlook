import { cn } from "@onlook/ui/utils";
import { useTheme } from "@/app/_components/theme";
import { SystemTheme } from "@onlook/models";
import { EditorView } from "@codemirror/view";
import {
  basicTheme,
  getBasicSetup,
  getExtensions,
} from "@/app/project/[id]/_components/right-panel/dev/code-mirror-config";
import { VARIANTS } from "./variants";
import CodeMirror from "@uiw/react-codemirror";
import { material } from "@uiw/codemirror-theme-material"


export const CodeBlock = ({
  className,
  code,
  variant,
}: {
  className?: string;
  code: string;
  variant?: "minimal" | "normal";
  disableColor?: boolean;
}) => {
  const { theme } = useTheme();
  const setting = VARIANTS[variant ?? "normal"];
  const LINE_HEIGHT = 20;

  const languageExtension = getExtensions("javascript");

  const extensions = [
    ...getBasicSetup(theme === SystemTheme.DARK, () => {
      // No-op save function since this is a read-only display
    }),
    ...languageExtension,
    material,
    EditorView.theme(
      {
        ...basicTheme,
        "&": {
          ...basicTheme["&"],
          height: "100%",
          width: "100%",
        },
        ".cm-content": {
          ...basicTheme[".cm-content"],
          lineHeight: `${LINE_HEIGHT}px`,
          padding: "8px",
        },
        ".cm-scroller": {
          overflow: "auto",
        },
      },
      {
        dark: theme === SystemTheme.DARK,
      },
    ),
  ];

  return (
    <CodeMirror
      value={code}
      readOnly={true}
      className={cn("flex w-full", className)}
    //   theme={theme === SystemTheme.DARK ? "dark" : "light"}
      extensions={extensions}

    />
  );
};
