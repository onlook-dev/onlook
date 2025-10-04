import { EditorTabValue } from "@onlook/models";
import type { EditorEngine } from "../engine";

export class IdeManager {
    constructor(private readonly editorEngine: EditorEngine) { }

    async openCodeBlock(oid: string) {
        // TODO: Implement
        // read the code block from the template nodes
        // create and add highlight range
        // open the code block in the code editor
        this.editorEngine.state.rightPanelTab = EditorTabValue.CODE;
    }

    async openFile(path: string) {
        // TODO: Implement
        // open the file in the code editor
        this.editorEngine.state.rightPanelTab = EditorTabValue.CODE;
    }
}