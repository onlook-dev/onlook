import { useEditorEngine } from "@/components/store/editor";
import { Icons } from "@onlook/ui/icons";
import { observer } from "mobx-react-lite";

export const BranchDisplay = observer(() => {
    const editorEngine = useEditorEngine();
    const branch = editorEngine.branches.activeBranch;
    return (
        <div className="text-sm text-foreground-secondary flex flex-row items-center gap-2">
            <Icons.GitBranch className="h-4 w-4" />
            <div>{branch.name}</div>
        </div>
    );
});