import { AlertDialog as LibraryAlertDialog, type AlertDialogProps } from '@astryxdesign/core/AlertDialog';
import { Dialog as LibraryDialog, type DialogProps } from '@astryxdesign/core/Dialog';
import { useModal, type ModalKind } from './modalStack.js';
import './dialog.css';

export { DialogHeader } from '@astryxdesign/core/Dialog';

/** The library's dialog, unchanged, with a place in the modal stack while it is open; an inline one is no modal. */
export function Dialog({ modal = 'dialog', ...props }: DialogProps & { modal?: ModalKind }): React.JSX.Element {
  useModal(props.isOpen && props.isInline !== true, modal);
  return <LibraryDialog {...props} />;
}

export function AlertDialog(props: AlertDialogProps): React.JSX.Element {
  useModal(props.isOpen && props.isInline !== true);
  return <LibraryAlertDialog {...props} />;
}

const FAILURE_DIALOG_WIDTH = 460;

/** The shell around a `FailureDialogBody`: any way out dismisses it. */
export function FailureDialog({ isOpen, onDismiss, titleId, descriptionId, isInline, 'data-testid': testId, children }: {
  isOpen: boolean;
  onDismiss: () => void;
  titleId: string;
  descriptionId: string;
  isInline?: boolean;
  'data-testid': string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      purpose="info"
      width={FAILURE_DIALOG_WIDTH}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      {...(isInline === undefined ? {} : { isInline })}
      data-testid={testId}
    >
      {children}
    </Dialog>
  );
}
