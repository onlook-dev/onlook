export interface Change<T> {
    updated: T;
    original: T;
}

function reverse<T>(change: Change<T>): Change<T> {
    return { updated: change.original, original: change.updated };
}

export interface UpdateStyleAction {
    type: 'update-style';
    targets: Array<{ webviewId: string; selector: string }>;
    style: string;
    change: Change<string>;
}

export type Action = UpdateStyleAction;

function undoAction(action: Action): Action {
    switch (action.type) {
        case 'update-style':
            return {
                type: 'update-style',
                targets: action.targets,
                style: action.style,
                change: reverse(action.change),
            };
    }
}

export class History {
    constructor(
        private undoStack: Action[] = [],
        private redoStack: Action[] = [],
    ) {}

    push = (action: Action) => {
        if (this.redoStack.length > 0) {
            this.redoStack = [];
        }

        this.undoStack.push(action);
    };

    undo = (): Action | null => {
        const top = this.undoStack.pop();
        if (top == null) {
            return null;
        }

        const reverseAction = undoAction(top);

        this.redoStack.push(reverseAction);
        return reverseAction;
    };
}
