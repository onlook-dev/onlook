import '../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { takeComplaints } from '../testing/dom.js';
import { AlertDialog, Dialog, FailureDialog } from './Dialog.js';
import { openModals } from './modalStack.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  takeComplaints();
  expect(openModals()).toEqual([]);
});

async function render(tree: React.ReactNode): Promise<HTMLDivElement> {
  if (root === undefined) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  await act(async () => { root!.render(tree); });
  return container!;
}

const noop = (): void => {};
const kinds = (): string[] => openModals().map((entry) => entry.kind);

it('a dialog is in the stack while it is open and out of it once it closes', async () => {
  await render(<Dialog isOpen={false} onOpenChange={noop} aria-label="Dialog">body</Dialog>);
  expect(kinds()).toEqual([]);
  await render(<Dialog isOpen onOpenChange={noop} aria-label="Dialog">body</Dialog>);
  expect(kinds()).toEqual(['dialog']);
  await render(<Dialog isOpen={false} onOpenChange={noop} aria-label="Dialog">body</Dialog>);
  expect(kinds()).toEqual([]);
});

it('an inline dialog is no modal', async () => {
  await render(<>
    <Dialog isOpen isInline onOpenChange={noop} aria-label="Dialog">body</Dialog>
    <AlertDialog isOpen isInline onOpenChange={noop} title="Title" description="Description" actionLabel="Go" cancelLabel="Cancel" onAction={noop} />
  </>);
  expect(kinds()).toEqual([]);
});

it('two open dialogs stack in the order they opened, under the kind each was given', async () => {
  await render(<>
    <AlertDialog isOpen onOpenChange={noop} title="Title" description="Description" actionLabel="Go" cancelLabel="Cancel" onAction={noop} />
    <Dialog isOpen={false} modal="gate" onOpenChange={noop} aria-label="Gate">gate</Dialog>
  </>);
  expect(kinds()).toEqual(['dialog']);
  await render(<>
    <AlertDialog isOpen onOpenChange={noop} title="Title" description="Description" actionLabel="Go" cancelLabel="Cancel" onAction={noop} />
    <Dialog isOpen modal="gate" onOpenChange={noop} aria-label="Gate">gate</Dialog>
  </>);
  expect(kinds()).toEqual(['dialog', 'gate']);
});

it('the kit dialog renders what the library renders, and takes no attribute for the stack', async () => {
  const node = await render(<Dialog isOpen isInline modal="gate" onOpenChange={noop} aria-label="Dialog" data-testid="kit">body</Dialog>);
  const kit = node.querySelector('[data-testid="kit"]');
  expect(kit).not.toBeNull();
  expect(kit!.hasAttribute('modal')).toBe(false);
});

it('the failure dialog is the library dialog at the failure width, named by its body', async () => {
  const node = await render(
    <FailureDialog isOpen isInline onDismiss={noop} titleId="title" descriptionId="description" data-testid="failure">
      <h2 id="title">Title</h2>
    </FailureDialog>,
  );
  const shell = node.querySelector<HTMLElement>('[data-testid="failure"]');
  expect(shell?.getAttribute('aria-labelledby')).toBe('title');
  expect(shell?.getAttribute('aria-describedby')).toBe('description');
  expect(shell?.textContent).toBe('Title');
  expect(shell?.getAttribute('style')).toContain('460px');
});

it('the failure dialog dismisses when the browser cancels it', async () => {
  let dismissed = 0;
  const node = await render(
    <FailureDialog isOpen onDismiss={() => { dismissed += 1; }} titleId="title" descriptionId="description" data-testid="failure">
      <h2 id="title">Title</h2>
    </FailureDialog>,
  );
  await act(async () => { node.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })); });
  expect(dismissed).toBe(1);
});
