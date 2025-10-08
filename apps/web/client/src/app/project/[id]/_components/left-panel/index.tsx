import { useEditorEngine } from "@/components/store/editor";
import { EditorMode } from "@onlook/models";
import { observer } from "mobx-react-lite";
import { CodePanel } from "./code-panel";
import { DesignPanel } from "./design-panel";

export const LeftPanel = observer(() => {
    const editorEngine = useEditorEngine();
    return editorEngine.state.editorMode === EditorMode.DESIGN ? <DesignPanel /> : <CodePanel />;
});