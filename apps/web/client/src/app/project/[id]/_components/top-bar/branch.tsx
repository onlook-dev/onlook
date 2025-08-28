import { useEditorEngine } from "@/components/store/editor";
import { observer } from "mobx-react-lite";

export const BranchDisplay = observer(() => {
    const editorEngine = useEditorEngine();
    const branch = editorEngine.branches.activeBranch;
    return <div className="text-sm text-foreground-secondary">{branch.name}</div>;
});