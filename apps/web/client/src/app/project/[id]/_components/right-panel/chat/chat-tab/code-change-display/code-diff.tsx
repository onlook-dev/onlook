import { useTheme } from "@/app/_components/theme";
import { SystemTheme } from "@onlook/models";
import { getBasicSetup } from "../../../dev/code-mirror-config";
import { getExtensions } from "../../../dev/code-mirror-config";
import CodeMirrorMerge from "react-codemirror-merge";
interface CodeDiffProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  showLineNumbers?: boolean;
  variant?: "minimal" | "normal";
}

const Original = CodeMirrorMerge.Original;
const Modified = CodeMirrorMerge.Modified;

export const CodeDiff = ({ originalCode, modifiedCode }: CodeDiffProps) => {
  const { theme } = useTheme();

  const languageExtension = getExtensions("javascript");
  const extensions = [
    ...getBasicSetup(() => {
      // No-op save function since this is a read-only display
    }),
    ...languageExtension,
  ];

  return (
    <CodeMirrorMerge orientation="a-b" theme={
      theme === SystemTheme.DARK ? SystemTheme.DARK : SystemTheme.LIGHT
    }>
      <Original value={originalCode} extensions={extensions} readOnly />
      <Modified value={modifiedCode} extensions={extensions} readOnly />
    </CodeMirrorMerge>
  );
};
