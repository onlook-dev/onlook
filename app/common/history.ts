export interface UpdateStyleAction {
  type: "update-style";
  targets: Array<{ webviewId: string; selector: string }>;
  selector: string;
  style: string;
  value: string;
  originalValue: string;
}

export type Action = UpdateStyleAction;

export function undoAction(action: Action): Action {
  switch (action.type) {
    case "update-style":
      return {
        type: "update-style",
        targets: action.targets,
        selector: action.selector,
        value: action.originalValue,
        style: action.style,
        originalValue: action.value,
      };
  }
}

export class History {
  constructor(
    private undoStack: Action[] = [],
    private redoStack: Action[] = []
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

    this.redoStack.push(top);
    return top;
  };
}
