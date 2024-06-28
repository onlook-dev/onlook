import { OverlayManager } from "./overlay";
import { EditorElementState } from "./state";

export class EditorEngine {
    private elementState: EditorElementState = new EditorElementState();
    private overlayManager: OverlayManager = new OverlayManager();

    get state() {
        return this.elementState;
    }
    get overlay() {
        return this.overlayManager;
    }
}
