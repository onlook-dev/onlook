import { cn } from "@onlook/ui/utils";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { VARIANTS } from "./variants";
import { useTheme } from "@/app/_components/theme";
import { basicTheme } from "../../../dev/code-mirror-config";
import { SystemTheme } from "@onlook/models";
import { getBasicSetup } from "../../../dev/code-mirror-config";
import { getExtensions } from "../../../dev/code-mirror-config";
import CodeMirrorMerge from "react-codemirror-merge";
import { material } from "@uiw/codemirror-theme-material"
interface CodeDiffProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  showLineNumbers?: boolean;
  variant?: "minimal" | "normal";
}

const Original = CodeMirrorMerge.Original;
const Modified = CodeMirrorMerge.Modified;

export const CodeDiff = ({
  originalCode,
  modifiedCode,
  variant,
}: CodeDiffProps) => {
  const { theme } = useTheme();
//   const diffContainer = useRef<HTMLDivElement | null>(null);
//   const diffEditor = useRef<MergeView | null>(null);
//   const setting = VARIANTS[variant ?? "normal"];
  const LINE_HEIGHT = 20;

//   useEffect(() => {
//     initCodeMirror();
//     return () => {
//       if (diffEditor.current) {
//         diffEditor.current.destroy();
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (diffEditor.current) {
//       updateDiffContent(originalCode, modifiedCode);
//     }
//   }, [originalCode, modifiedCode]);

  // useEffect(() => {
  //     if (diffEditor.current) {
  //         diffEditor.current.updateOptions({
  //             // @ts-expect-error - Option exists
  //             theme: theme === 'light' ? 'light-plus' : 'dark-plus',
  //         });
  //     }
  // }, [theme]);

//   const getEditorHeight = (code: string) => {
//     const lineCount = code.split("\n").length;
//     return lineCount * LINE_HEIGHT + 25;
//   };

//   function initCodeMirror() {
//     if (!diffContainer.current) return;

//     const height = Math.max(
//       getEditorHeight(originalCode),
//       getEditorHeight(modifiedCode),
//     );
//     diffContainer.current.style.height = `${height}px`;

//     const extensions = [
//       ...getBasicSetup(theme === SystemTheme.DARK, () => {
//         // No-op save function since this is a read-only display
//       }),
//       ...getExtensions("javascript"),
//       EditorView.theme({
//         ...basicTheme,
//         "&": {
//           ...basicTheme["&"],
//           height: "100%",
//         },
//         ".cm-content": {
//           ...basicTheme[".cm-content"],
//           lineHeight: `${LINE_HEIGHT}px`,
//         },
//       }),
//     ];

//     diffEditor.current = new MergeView({
//       parent: diffContainer.current,
//       orientation: "a-b",
//       a: { doc: originalCode, extensions },
//       b: { doc: modifiedCode, extensions },
//     });
//   }

  function updateDiffContent(original: string, modified: string) {
    // if (!diffEditor.current) {
    //   console.error("Diff editor not initialized.");
    //   return;
    // }

    // const originalModel = monaco.editor.createModel(original, 'javascript');
    // const modifiedModel = monaco.editor.createModel(modified, 'javascript');

    // diffEditor.current.setModel({
    //     original: originalModel,
    //     modified: modifiedModel,
    // });
  }
  const languageExtension = getExtensions("javascript");
  const extensions = [
    ...getBasicSetup(theme === SystemTheme.DARK, () => {
      // No-op save function since this is a read-only display
    }),
    material,
    ...languageExtension,
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
    <CodeMirrorMerge
      orientation="a-b"
    //   theme={theme === SystemTheme.DARK ? "dark" : "light"}
      highlightChanges
      gutter
      
    >
      <Original value={originalCode} extensions={extensions} readOnly />
      <Modified value={modifiedCode} extensions={extensions} readOnly />
    </CodeMirrorMerge>
  );
};
